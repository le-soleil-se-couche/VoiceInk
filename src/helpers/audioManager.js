import ReasoningService from "../services/ReasoningService";
import { API_ENDPOINTS, NETWORK_TIMEOUTS, buildApiUrl, normalizeBaseUrl } from "../config/constants";
import { buildCleanupUserMessage, getAnswerLikeRetryPrompt, getSystemPrompt } from "../config/prompts";
import logger from "../utils/logger";
import { isBuiltInMicrophone } from "../utils/audioDeviceUtils";
import { isSecureEndpoint } from "../utils/urlUtils";
import { withSessionRefresh } from "../lib/neonAuth";
import { getBaseLanguageCode, validateLanguageForModel } from "../utils/languageSupport";
import { classifyContext, getTargetAppInfo, DEFAULT_STRICT_OVERLAP_THRESHOLD } from "../utils/contextClassifier";
import { canonicalizeDictationText } from "../utils/dictationCanonicalizer";
import {
  getSettings,
  getEffectiveReasoningModel,
  isCloudReasoningMode,
} from "../stores/settingsStore";

const SHORT_CLIP_DURATION_SECONDS = 2.5;
const REASONING_CACHE_TTL = 30000; // 30 seconds
const RECORDING_OUTPUT_MUTE_DELAY_MS = 260;
const STREAMING_CANONICALIZER_TARGET_MS = 5;
const STREAMING_CANONICALIZER_HARD_LIMIT_MS = 10;
const MAC_STRICT_SHORT_INPUT_THRESHOLD = 18;
const MAC_STRICT_MAX_EXPANSION_RATIO = 1.35;
const MAC_STRICT_MIN_OUTPUT_COVERAGE = 0.7;
const FLAG_CANONICALIZER_ENABLED = "dictationCanonicalizerEnabled";
const FLAG_NUMBER_CANONICALIZER_ENABLED = "dictationNumberCanonicalizerEnabled";
const FLAG_PUNCTUATION_CANONICALIZER_ENABLED = "dictationPunctuationCanonicalizerEnabled";

const PLACEHOLDER_KEYS = {
  openai: "your_openai_api_key_here",
  groq: "your_groq_api_key_here",
  mistral: "your_mistral_api_key_here",
};

const isValidApiKey = (key, provider = "openai") => {
  if (!key || key.trim() === "") return false;
  const placeholder = PLACEHOLDER_KEYS[provider] || PLACEHOLDER_KEYS.openai;
  return key !== placeholder;
};

const ANSWER_LIKE_TRANSCRIPTION_PATTERNS = [
  /(作为|身为).{0,10}(ai|语言模型|助手)/i,
  /\b(as\s+(?:an?|your)\s+(?:ai\s+)?(?:assistant|language\s+model))\b/i,
  /(我无法|不能|不会|不可以).{0,18}(提供|协助|回答|满足|处理)/,
  /如果您想.{0,20}(测试|试试|尝试).{0,30}(语音转文字|转录|句子|示例)/,
  /(不用担心|别担心|我会尽力|我可以帮你|请告诉我|请问你|[你您]想要).{0,40}/,
  /^(?:好的|好|是的|对|對|嗯)[，,、]\s*.+(?:吗|麼|么|[?？])$/u,
  /\b(as an ai|as a language model)\b/i,
  /\b(i(?:'m| am)\s+here\s+to\s+help(?:\s+with\s+that)?)\b/i,
  /\b(i\s*(can't|cannot|am unable|won't))\b/i,
  /^(?:sure|yes|yeah|yep|okay|ok|alright|certainly|of\s+course|absolutely)[,，]\s+(?:what|when|where|why|who|which|how|is|are|am|do|does|did|can|could|would|should|shall|will|has|have|had)\b/i,
  /\b(if you want to test).{0,30}(speech[- ]to[- ]text|transcription)\b/i,
  /\b(you can try).{0,20}(sentence|example)\b/i,
];

const ENGLISH_FILLER_WORD_RE =
  /\b(?:um+|uh+|er+|ah+|hmm+|mm+|you\s+know|basically)\b/gi;
const CHINESE_FILLER_WORD_RE =
  /(^|[\s，。！？、,.!?;:])(?:嗯+|呃+|额+|啊+|唉+|诶+|欸+)(?=$|[\s，。！？、,.!?;:])/g;
const CHINESE_STUTTER_RE = /([我你他她它这那])(?:\s*[，,、]?\s*\1)+/g;
const ENGLISH_STUTTER_RE =
  /\b(i|we|you|he|she|they|it|the|a|an|to|and|but)\b(?:\s+\1\b)+/gi;
const INLINE_CHINESE_FILLER_RE =
  /([\u4e00-\u9fff])\s*(?:嗯+|呃+|额+|啊+|唉+|诶+|欸+)\s*([\u4e00-\u9fff])/g;
const INLINE_CHINESE_FUNCTION_WORD_STUTTER_RE =
  /([\u4e00-\u9fff])\s*((?:是|就|在|会|要|的|了))(?:\s*[，,、]?\s*\2)+\s*([\u4e00-\u9fff])/g;
const CHINESE_FUNCTION_WORD_STUTTER_RE =
  /(^|[\s，,、。！？,.!?;:])((?:这个|那个|就是|然后|是|就|那|这|我|你|他|她|它|的|了|在|要|会|都|也|还))(?:\s*[，,、]?\s*\2)+/g;
const CHINESE_WORD_REPEAT_STUTTER_RE =
  /([\u4e00-\u9fff]{2,4})(?:\s*[，,、；;]\s*)\1(?=[\u4e00-\u9fff，,、。！？\s]|$)/g;

const isAnswerLikeTranscriptionOutput = (text) => {
  if (typeof text !== "string") return false;
  const trimmed = text.trim();
  if (trimmed.length < 20) return false;
  return ANSWER_LIKE_TRANSCRIPTION_PATTERNS.some((re) => re.test(trimmed));
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Split by script family so mixed tokens like "readme在" become ["readme", "在"].
const DICTIONARY_TOKEN_RE =
  /[\p{Script=Latin}\p{N}]+|[\p{Script=Han}\p{N}]+|[\p{L}\p{N}]+/gu;
const MAX_DICTIONARY_NGRAM = 12;
const ENGLISH_NUMBER_WORD_VALUES = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
const CHINESE_NUMBER_DIGIT_VALUES = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};
const CHINESE_NUMBER_UNIT_VALUES = {
  十: 10,
  百: 100,
  千: 1000,
  万: 10000,
  萬: 10000,
};
const ENGLISH_NUMBER_SEQUENCE_RE =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|and)(?:[\s-]+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|and))*\b/gi;
const CHINESE_NUMBER_SEQUENCE_RE = /[零〇一二两三四五六七八九十百千万萬]+/g;
const ASR_CONFUSION_REPLACEMENTS = [
  ["claw", "cloud"],
  ["cloud", "claw"],
  ["flux", "flags"],
  ["flags", "flux"],
  ["bot", "board"],
  ["board", "bot"],
  ["boat", "bot"],
  ["bot", "boat"],
  ["rss", "2ss"],
  ["2ss", "rss"],
  ["rss", "ss"],
];

const parseEnglishNumberWords = (tokens) => {
  if (!Array.isArray(tokens) || tokens.length === 0) return null;

  let total = 0;
  let current = 0;
  let seenNumber = false;

  for (const token of tokens) {
    if (!token || token === "and") continue;

    const numericValue = ENGLISH_NUMBER_WORD_VALUES[token];
    if (Number.isFinite(numericValue)) {
      current += numericValue;
      seenNumber = true;
      continue;
    }

    if (token === "hundred") {
      current = Math.max(current, 1) * 100;
      seenNumber = true;
      continue;
    }

    if (token === "thousand" || token === "million" || token === "billion") {
      const multiplier = token === "thousand" ? 1000 : token === "million" ? 1000000 : 1000000000;
      total += Math.max(current, 1) * multiplier;
      current = 0;
      seenNumber = true;
      continue;
    }

    return null;
  }

  if (!seenNumber) return null;
  return String(total + current);
};

const normalizeSpokenEnglishNumbers = (value) =>
  value.replace(ENGLISH_NUMBER_SEQUENCE_RE, (segment) => {
    const tokens = segment
      .toLowerCase()
      .split(/[\s-]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const parsed = parseEnglishNumberWords(tokens);
    return parsed ?? segment;
  });

const parseChineseNumberWords = (segment) => {
  if (!segment || typeof segment !== "string") return null;

  let total = 0;
  let section = 0;
  let currentDigit = 0;
  let seenNumberToken = false;
  let hasUnit = false;

  for (const char of segment) {
    if (Object.prototype.hasOwnProperty.call(CHINESE_NUMBER_DIGIT_VALUES, char)) {
      currentDigit = CHINESE_NUMBER_DIGIT_VALUES[char];
      seenNumberToken = true;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(CHINESE_NUMBER_UNIT_VALUES, char)) {
      const unit = CHINESE_NUMBER_UNIT_VALUES[char];
      seenNumberToken = true;
      hasUnit = true;

      if (unit >= 10000) {
        section += currentDigit;
        if (section === 0) section = 1;
        total += section * unit;
        section = 0;
        currentDigit = 0;
        continue;
      }

      const base = currentDigit === 0 ? 1 : currentDigit;
      section += base * unit;
      currentDigit = 0;
      continue;
    }

    return null;
  }

  if (!seenNumberToken) return null;

  if (!hasUnit) {
    const digits = [...segment]
      .map((char) => CHINESE_NUMBER_DIGIT_VALUES[char])
      .filter((value) => Number.isFinite(value));
    if (digits.length !== segment.length) return null;
    return String(Number(digits.join("")));
  }

  return String(total + section + currentDigit);
};

const normalizeSpokenChineseNumbers = (value) =>
  value.replace(CHINESE_NUMBER_SEQUENCE_RE, (segment) => {
    const parsed = parseChineseNumberWords(segment);
    return parsed ?? segment;
  });

const buildTargetedCanonicalAliasKeys = (normalizedKey) => {
  const aliases = new Set();
  if (!normalizedKey) return aliases;

  if (normalizedKey.includes("qwen")) {
    aliases.add(normalizedKey.replace(/qwen/g, "1000问"));
    aliases.add(normalizedKey.replace(/qwen/g, "千问"));
    aliases.add(normalizedKey.replace(/qwen/g, "请问"));
    aliases.add(normalizedKey.replace(/qwen/g, "前问"));
    aliases.add(normalizedKey.replace(/qwen/g, "青问"));
  }

  if (normalizedKey.includes("moltbot")) {
    aliases.add(normalizedKey.replace(/moltbot/g, "modeboat"));
    aliases.add(normalizedKey.replace(/moltbot/g, "modebot"));
    aliases.add(normalizedKey.replace(/moltbot/g, "moltboat"));
  }

  if (normalizedKey.includes("rss")) {
    aliases.add(normalizedKey.replace(/rss/g, "2ss"));
    aliases.add(normalizedKey.replace(/rss/g, "ss"));

    if (normalizedKey.startsWith("we")) {
      aliases.add(normalizedKey.replace(/^we/, "v"));
      aliases.add(normalizedKey.replace(/^we/, "wi"));
      aliases.add(normalizedKey.replace(/^we/, "ve"));
    }

    if (normalizedKey.startsWith("wewe")) {
      aliases.add(normalizedKey.replace(/^wewe/, "we"));
      aliases.add(normalizedKey.replace(/^wewe/, "v"));
    }
  }

  // "千问" is normalized to "1000问" by number canonicalization.
  // Add common ASR confusions so dictionary normalization can still recover it.
  if (normalizedKey.includes("1000问")) {
    aliases.add(normalizedKey.replace(/1000问/g, "qwen"));
    aliases.add(normalizedKey.replace(/1000问/g, "请问"));
    aliases.add(normalizedKey.replace(/1000问/g, "前问"));
    aliases.add(normalizedKey.replace(/1000问/g, "青问"));
    aliases.add(normalizedKey.replace(/1000问/g, "1000文"));
  }

  return aliases;
};

const collapseRepeatedLatinChars = (value) => value.replace(/([a-z])\1+/g, "$1");

const toConsonantSkeleton = (value) => {
  if (!value || value.length < 3) return value;
  return `${value[0]}${value.slice(1).replace(/[aeiou]/g, "")}`;
};

const addKeyVariant = (set, candidate) => {
  if (!candidate || candidate.length < 2 || set.has(candidate)) return;
  if (set.size >= 32) return;
  set.add(candidate);
};

const expandDictionaryKeyVariants = (key) => {
  const variants = new Set();
  if (!key) return variants;

  const seeds = [
    key,
    collapseRepeatedLatinChars(key),
    toConsonantSkeleton(key),
    toConsonantSkeleton(collapseRepeatedLatinChars(key)),
  ];

  for (const seed of seeds) {
    addKeyVariant(variants, seed);
    addKeyVariant(variants, seed.replace(/w/g, "v"));
    addKeyVariant(variants, seed.replace(/v/g, "w"));
    addKeyVariant(variants, seed.replace(/y/g, "i"));
    addKeyVariant(variants, seed.replace(/i/g, "y"));
    addKeyVariant(variants, collapseRepeatedLatinChars(seed.replace(/y/g, "i")));
    addKeyVariant(variants, collapseRepeatedLatinChars(seed.replace(/i/g, "y")));
    addKeyVariant(variants, toConsonantSkeleton(seed.replace(/w/g, "v")));
    addKeyVariant(variants, toConsonantSkeleton(seed.replace(/v/g, "w")));
  }

  return variants;
};

const normalizeDictionaryKey = (value) =>
  normalizeSpokenEnglishNumbers(
    normalizeSpokenChineseNumbers((value || "").toString().toLowerCase().normalize("NFKC"))
  ).replace(/[^\p{L}\p{N}]+/gu, "");

const buildAsrConfusionAliasKeys = (normalizedKey) => {
  const aliases = new Set();
  if (!normalizedKey) return aliases;

  for (const [from, to] of ASR_CONFUSION_REPLACEMENTS) {
    if (normalizedKey.includes(from)) {
      aliases.add(normalizedKey.replace(new RegExp(from, "g"), to));
    }
  }

  return aliases;
};

const splitCamelCase = (value) => value.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

const editDistance = (a, b) => {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
};

const getMaxAllowedDictionaryDistance = (sourceKey, targetKey) => {
  const maxLen = Math.max(sourceKey.length, targetKey.length);
  if (maxLen < 6) return 0;
  if (maxLen < 8) return 1;
  if (maxLen < 16) return 2;
  return 3;
};

const buildDictionaryCanonicalEntries = (dictionary) => {
  const words = Array.isArray(dictionary) ? dictionary : [];
  const entries = [];
  const seenCanonical = new Set();

  for (const rawWord of words) {
    const canonical = typeof rawWord === "string" ? rawWord.trim() : "";
    if (!canonical) continue;

    const canonicalKey = normalizeDictionaryKey(canonical);
    if (!canonicalKey || seenCanonical.has(canonicalKey)) continue;
    seenCanonical.add(canonicalKey);

    const aliasKeys = new Set([canonicalKey]);
    const camelSplitKey = normalizeDictionaryKey(splitCamelCase(canonical));
    if (camelSplitKey) aliasKeys.add(camelSplitKey);
    for (const key of [...aliasKeys]) {
      const confusionAliases = buildAsrConfusionAliasKeys(key);
      for (const alias of confusionAliases) {
        if (alias) aliasKeys.add(alias);
      }
      const targetedAliases = buildTargetedCanonicalAliasKeys(key);
      for (const alias of targetedAliases) {
        if (alias) aliasKeys.add(alias);
      }
    }
    for (const key of [...aliasKeys]) {
      const variants = expandDictionaryKeyVariants(key);
      for (const variant of variants) {
        aliasKeys.add(variant);
      }
    }

    entries.push({
      canonical,
      canonicalKey,
      aliasKeys: Array.from(aliasKeys),
    });
  }

  return entries;
};

const applyDictionaryCanonicalization = (text, entries) => {
  if (typeof text !== "string" || !text || !Array.isArray(entries) || entries.length === 0) {
    return { text, replacements: 0, matches: [] };
  }

  const tokens = [];
  DICTIONARY_TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = DICTIONARY_TOKEN_RE.exec(text)) !== null) {
    tokens.push({
      start: match.index,
      end: match.index + match[0].length,
      value: match[0],
    });
  }

  if (tokens.length === 0) {
    return { text, replacements: 0, matches: [] };
  }

  let cursor = 0;
  let output = "";
  let tokenIndex = 0;
  let replacements = 0;
  const matches = [];

  while (tokenIndex < tokens.length) {
    let bestMatch = null;

    const maxWindow = Math.min(MAX_DICTIONARY_NGRAM, tokens.length - tokenIndex);
    for (let windowSize = maxWindow; windowSize >= 1; windowSize -= 1) {
      const start = tokens[tokenIndex].start;
      const end = tokens[tokenIndex + windowSize - 1].end;
      const segment = text.slice(start, end);
      const sourceKey = normalizeDictionaryKey(segment);
      if (!sourceKey) continue;
      const sourceKeyVariants = expandDictionaryKeyVariants(sourceKey);
      sourceKeyVariants.add(sourceKey);

      for (const entry of entries) {
        for (const aliasKey of entry.aliasKeys) {
          let bestDistance = Number.POSITIVE_INFINITY;
          for (const sourceVariant of sourceKeyVariants) {
            let distance = Number.POSITIVE_INFINITY;
            if (sourceVariant === aliasKey) {
              distance = 0;
            } else {
              const maxAllowedDistance = getMaxAllowedDictionaryDistance(sourceVariant, aliasKey);
              if (maxAllowedDistance > 0 && Math.abs(sourceVariant.length - aliasKey.length) <= 2) {
                const fuzzyDistance = editDistance(sourceVariant, aliasKey);
                if (fuzzyDistance <= maxAllowedDistance) {
                  distance = fuzzyDistance;
                }
              }
            }

            if (Number.isFinite(distance) && distance < bestDistance) {
              bestDistance = distance;
              if (distance === 0) break;
            }
          }

          if (!Number.isFinite(bestDistance)) continue;

          if (
            !bestMatch ||
            bestDistance < bestMatch.distance ||
            (bestDistance === bestMatch.distance && windowSize > bestMatch.windowSize)
          ) {
            bestMatch = {
              start,
              end,
              canonical: entry.canonical,
              windowSize,
              distance: bestDistance,
            };
          }
        }
      }
    }

    if (!bestMatch) {
      tokenIndex += 1;
      continue;
    }

    output += text.slice(cursor, bestMatch.start);
    output += bestMatch.canonical;
    if (matches.length < 8) {
      matches.push({
        from: text.slice(bestMatch.start, bestMatch.end),
        to: bestMatch.canonical,
        distance: bestMatch.distance,
      });
    }
    cursor = bestMatch.end;
    tokenIndex += bestMatch.windowSize;
    replacements += 1;
  }

  if (replacements === 0) {
    return { text, replacements: 0, matches: [] };
  }

  output += text.slice(cursor);
  return { text: output, replacements, matches };
};

const QWEN_ASR_MODEL_RE = /^qwen[\w.-]*asr/i;

const isQwenAsrModel = (model) => QWEN_ASR_MODEL_RE.test((model || "").trim());

const resolveCustomChatCompletionsEndpoint = (endpoint) => {
  const trimmed = (endpoint || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /\/chat\/completions$/i.test(trimmed) ? trimmed : `${trimmed}/chat/completions`;
};

const extractChatCompletionText = (data) => {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        if (typeof item?.content === "string") return item.content;
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

const STREAMING_PROVIDERS = {
  deepgram: {
    warmup: (opts) => window.electronAPI.deepgramStreamingWarmup(opts),
    start: (opts) => window.electronAPI.deepgramStreamingStart(opts),
    send: (buf) => window.electronAPI.deepgramStreamingSend(buf),
    finalize: () => window.electronAPI.deepgramStreamingFinalize(),
    stop: () => window.electronAPI.deepgramStreamingStop(),
    status: () => window.electronAPI.deepgramStreamingStatus(),
    onPartial: (cb) => window.electronAPI.onDeepgramPartialTranscript(cb),
    onFinal: (cb) => window.electronAPI.onDeepgramFinalTranscript(cb),
    onError: (cb) => window.electronAPI.onDeepgramError(cb),
    onSessionEnd: (cb) => window.electronAPI.onDeepgramSessionEnd(cb),
  },
  assemblyai: {
    warmup: (opts) => window.electronAPI.assemblyAiStreamingWarmup(opts),
    start: (opts) => window.electronAPI.assemblyAiStreamingStart(opts),
    send: (buf) => window.electronAPI.assemblyAiStreamingSend(buf),
    finalize: () => window.electronAPI.assemblyAiStreamingForceEndpoint(),
    stop: () => window.electronAPI.assemblyAiStreamingStop(),
    status: () => window.electronAPI.assemblyAiStreamingStatus(),
    onPartial: (cb) => window.electronAPI.onAssemblyAiPartialTranscript(cb),
    onFinal: (cb) => window.electronAPI.onAssemblyAiFinalTranscript(cb),
    onError: (cb) => window.electronAPI.onAssemblyAiError(cb),
    onSessionEnd: (cb) => window.electronAPI.onAssemblyAiSessionEnd(cb),
  },
};

class AudioManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.isProcessing = false;
    this.onStateChange = null;
    this.onError = null;
    this.onTranscriptionComplete = null;
    this.onPartialTranscript = null;
    this.cachedApiKey = null;
    this.cachedApiKeyProvider = null;

    this._onApiKeyChanged = () => {
      this.cachedApiKey = null;
      this.cachedApiKeyProvider = null;
    };
    window.addEventListener("api-key-changed", this._onApiKeyChanged);
    this.cachedTranscriptionEndpoint = null;
    this.cachedEndpointProvider = null;
    this.cachedEndpointBaseUrl = null;
    this.recordingStartTime = null;
    this.reasoningAvailabilityCache = { value: false, expiresAt: 0 };
    this.cachedReasoningPreference = null;
    this.isStreaming = false;
    this.streamingAudioContext = null;
    this.streamingSource = null;
    this.streamingProcessor = null;
    this.streamingStream = null;
    this.streamingCleanupFns = [];
    this.streamingFinalText = "";
    this.streamingPartialText = "";
    this.streamingTextResolve = null;
    this.streamingTextDebounce = null;
    this.cachedMicDeviceId = null;
    this.persistentAudioContext = null;
    this.workletModuleLoaded = false;
    this.workletBlobUrl = null;
    this.streamingStartInProgress = false;
    this.streamingStopInProgress = false;
    this.stopRequestedDuringStreamingStart = false;
    this.streamingFallbackRecorder = null;
    this.streamingFallbackChunks = [];
    this.skipReasoning = false;
    this.context = "dictation";
    this.sttConfig = null;
    this.systemPlaybackMutedForRecording = false;
    this.recordingOutputMuteTimer = null;
  }

  getWorkletBlobUrl() {
    if (this.workletBlobUrl) return this.workletBlobUrl;
    const code = `
const BUFFER_SIZE = 800;
class PCMStreamingProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Int16Array(BUFFER_SIZE);
    this._offset = 0;
    this._stopped = false;
    this.port.onmessage = (event) => {
      if (event.data === "stop") {
        if (this._offset > 0) {
          const partial = this._buffer.slice(0, this._offset);
          this.port.postMessage(partial.buffer, [partial.buffer]);
          this._buffer = new Int16Array(BUFFER_SIZE);
          this._offset = 0;
        }
        this._stopped = true;
      }
    };
  }
  process(inputs) {
    if (this._stopped) return false;
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      this._buffer[this._offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this._offset >= BUFFER_SIZE) {
        this.port.postMessage(this._buffer.buffer, [this._buffer.buffer]);
        this._buffer = new Int16Array(BUFFER_SIZE);
        this._offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm-streaming-processor", PCMStreamingProcessor);
`;
    this.workletBlobUrl = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
    return this.workletBlobUrl;
  }

  getCustomDictionaryPrompt() {
    const words = getSettings().customDictionary;
    return words.length > 0 ? words.join(", ") : null;
  }

  setCallbacks({
    onStateChange,
    onError,
    onTranscriptionComplete,
    onPartialTranscript,
    onStreamingCommit,
  }) {
    this.onStateChange = onStateChange;
    this.onError = onError;
    this.onTranscriptionComplete = onTranscriptionComplete;
    this.onPartialTranscript = onPartialTranscript;
    this.onStreamingCommit = onStreamingCommit;
  }

  setSkipReasoning(skip) {
    this.skipReasoning = skip;
  }

  setContext(context) {
    this.context = context;
  }

  setSttConfig(config) {
    this.sttConfig = config;
  }

  getRuntimePlatform() {
    if (typeof window === "undefined") return "unknown";
    return window.electronAPI?.getPlatform?.() || "unknown";
  }

  isDarwinPlatform() {
    return this.getRuntimePlatform() === "darwin";
  }

  buildOpenWhisprCloudTranscribeOptions(settings = getSettings()) {
    const language = getBaseLanguageCode(settings.preferredLanguage);
    const opts = {};
    if (language) opts.language = language;

    const reasoningMode = settings.cloudReasoningMode || "openwhispr";
    if (settings.useReasoningModel && !this.skipReasoning && reasoningMode === "openwhispr") {
      opts.sendLogs = "false";
    }

    const dictionaryPrompt = this.getCustomDictionaryPrompt();
    if (dictionaryPrompt) opts.prompt = dictionaryPrompt;

    return opts;
  }

  buildAnswerLikeRetryTranscribeOptions(settings = getSettings()) {
    const opts = this.buildOpenWhisprCloudTranscribeOptions(settings);
    opts.prompt = getAnswerLikeRetryPrompt(
      settings.customDictionary,
      settings.uiLanguage || "en"
    );
    return opts;
  }

  async requestOpenWhisprCloudTranscription(arrayBuffer, opts) {
    return withSessionRefresh(async () => {
      const res = await window.electronAPI.cloudTranscribe(arrayBuffer, opts);
      if (!res.success) {
        const err = new Error(res.error || "Cloud transcription failed");
        err.code = res.code;
        throw err;
      }
      return res;
    });
  }

  buildAnswerLikeAsrError(source) {
    const err = new Error(
      "Detected assistant-style transcription twice. Please re-record this sentence in plain dictation."
    );
    err.code = "ASR_ANSWER_LIKE_OUTPUT";
    err.source = source;
    return err;
  }

  async guardMacAsrAnswerLikeOutput(text, { source, retryOnce } = {}) {
    const normalizedText = typeof text === "string" ? text : "";
    if (!this.isDarwinPlatform()) {
      return normalizedText;
    }

    if (!isAnswerLikeTranscriptionOutput(normalizedText)) {
      return normalizedText;
    }

    logger.logReasoning("ASR_GUARD_RETRY_MAC", {
      source,
      textLength: normalizedText.length,
      preview: normalizedText.slice(0, 120),
    });

    let retriedText = "";
    if (typeof retryOnce === "function") {
      retriedText = (await retryOnce()) || "";
    }

    if (!isAnswerLikeTranscriptionOutput(retriedText)) {
      return retriedText;
    }

    logger.logReasoning("ASR_GUARD_BLOCKED_MAC", {
      source,
      firstTextLength: normalizedText.length,
      retryTextLength: retriedText.length,
      firstPreview: normalizedText.slice(0, 120),
      retryPreview: retriedText.slice(0, 120),
    });

    throw this.buildAnswerLikeAsrError(source || "openwhispr-cloud");
  }

  shouldMuteSystemPlaybackWhileRecording() {
    if (typeof window === "undefined") return false;
    if (window.electronAPI?.getPlatform?.() !== "win32") return false;
    return Boolean(getSettings().muteSystemAudioWhileRecording);
  }

  clearPendingRecordingOutputMute() {
    if (!this.recordingOutputMuteTimer) return;
    clearTimeout(this.recordingOutputMuteTimer);
    this.recordingOutputMuteTimer = null;
  }

  scheduleRecordingOutputMute(delayMs = RECORDING_OUTPUT_MUTE_DELAY_MS) {
    if (!this.shouldMuteSystemPlaybackWhileRecording()) return;
    this.clearPendingRecordingOutputMute();
    this.recordingOutputMuteTimer = setTimeout(() => {
      this.recordingOutputMuteTimer = null;
      if (!this.isRecording && !this.isStreaming && !this.streamingStartInProgress) return;
      this.applyRecordingOutputMute().catch((error) => {
        logger.debug(
          "Delayed recording output mute failed",
          { error: error.message },
          "audio"
        );
      });
    }, delayMs);
  }

  async setRecordingOutputMuted(muted) {
    if (typeof window === "undefined" || !window.electronAPI?.setRecordingOutputMuted) return false;
    try {
      const result = await window.electronAPI.setRecordingOutputMuted(Boolean(muted));
      if (!result?.success) {
        logger.debug(
          "Failed to update recording output mute",
          { muted: Boolean(muted), error: result?.error, reason: result?.reason },
          "audio"
        );
        return false;
      }
      return true;
    } catch (error) {
      logger.debug(
        "Recording output mute IPC failed",
        { muted: Boolean(muted), error: error.message },
        "audio"
      );
      return false;
    }
  }

  async applyRecordingOutputMute() {
    if (!this.shouldMuteSystemPlaybackWhileRecording()) return;
    if (this.systemPlaybackMutedForRecording) return;
    const muted = await this.setRecordingOutputMuted(true);
    if (muted) {
      this.systemPlaybackMutedForRecording = true;
    }
  }

  async releaseRecordingOutputMute() {
    this.clearPendingRecordingOutputMute();
    if (!this.systemPlaybackMutedForRecording) return;
    await this.setRecordingOutputMuted(false);
    this.systemPlaybackMutedForRecording = false;
  }

  getStreamingProvider() {
    const providerName = this.sttConfig?.streamingProvider || "deepgram";
    return STREAMING_PROVIDERS[providerName] || STREAMING_PROVIDERS.deepgram;
  }

  async getAudioConstraints() {
    const { preferBuiltInMic: preferBuiltIn, selectedMicDeviceId: selectedDeviceId } =
      getSettings();

    // Disable browser audio processing — dictation doesn't need it and it adds ~48ms latency
    const noProcessing = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    };

    if (preferBuiltIn) {
      if (this.cachedMicDeviceId) {
        logger.debug(
          "Using cached microphone device ID",
          { deviceId: this.cachedMicDeviceId },
          "audio"
        );
        return { audio: { deviceId: { exact: this.cachedMicDeviceId }, ...noProcessing } };
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        const builtInMic = audioInputs.find((d) => isBuiltInMicrophone(d.label));

        if (builtInMic) {
          this.cachedMicDeviceId = builtInMic.deviceId;
          logger.debug(
            "Using built-in microphone (cached for next time)",
            { deviceId: builtInMic.deviceId, label: builtInMic.label },
            "audio"
          );
          return { audio: { deviceId: { exact: builtInMic.deviceId }, ...noProcessing } };
        }
      } catch (error) {
        logger.debug(
          "Failed to enumerate devices for built-in mic detection",
          { error: error.message },
          "audio"
        );
      }
    }

    if (!preferBuiltIn && selectedDeviceId) {
      logger.debug("Using selected microphone", { deviceId: selectedDeviceId }, "audio");
      return { audio: { deviceId: { exact: selectedDeviceId }, ...noProcessing } };
    }

    logger.debug("Using default microphone", {}, "audio");
    return { audio: noProcessing };
  }

  async cacheMicrophoneDeviceId() {
    if (this.cachedMicDeviceId) return; // Already cached

    if (!getSettings().preferBuiltInMic) return; // Only needed for built-in mic detection

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const builtInMic = audioInputs.find((d) => isBuiltInMicrophone(d.label));
      if (builtInMic) {
        this.cachedMicDeviceId = builtInMic.deviceId;
        logger.debug("Microphone device ID pre-cached", { deviceId: builtInMic.deviceId }, "audio");
      }
    } catch (error) {
      logger.debug("Failed to pre-cache microphone device ID", { error: error.message }, "audio");
    }
  }

  async startRecording() {
    try {
      if (this.isRecording || this.isProcessing || this.mediaRecorder?.state === "recording") {
        return false;
      }

      const constraints = await this.getAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        logger.info(
          "Recording started with microphone",
          {
            label: audioTrack.label,
            deviceId: settings.deviceId?.slice(0, 20) + "...",
            sampleRate: settings.sampleRate,
            channelCount: settings.channelCount,
          },
          "audio"
        );
      }

      // Silence detection: observe audio energy via AnalyserNode
      try {
        this._silenceCtx = new AudioContext();
        this._silenceAnalyser = this._silenceCtx.createAnalyser();
        this._silenceAnalyser.fftSize = 2048;
        const sourceNode = this._silenceCtx.createMediaStreamSource(stream);
        sourceNode.connect(this._silenceAnalyser);
        this._peakRms = 0;
        const dataArray = new Uint8Array(this._silenceAnalyser.fftSize);
        this._silenceInterval = setInterval(() => {
          this._silenceAnalyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          if (rms > this._peakRms) this._peakRms = rms;
        }, 100);
      } catch (e) {
        logger.warn("Silence detection setup failed, skipping", { error: e.message }, "audio");
        this._peakRms = 1; // assume speech if detection fails
      }

      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.recordingStartTime = Date.now();
      this.recordingMimeType = this.mediaRecorder.mimeType || "audio/webm";

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        // Clean up silence detection
        if (this._silenceInterval) {
          clearInterval(this._silenceInterval);
          this._silenceInterval = null;
        }
        this._silenceCtx?.close().catch(() => {});
        this._silenceCtx = null;
        this._silenceAnalyser = null;

        this.isRecording = false;
        this.isProcessing = true;
        this.onStateChange?.({ isRecording: false, isProcessing: true });
        await this.releaseRecordingOutputMute();

        const audioBlob = new Blob(this.audioChunks, { type: this.recordingMimeType });

        logger.info(
          "Recording stopped",
          {
            blobSize: audioBlob.size,
            blobType: audioBlob.type,
            chunksCount: this.audioChunks.length,
          },
          "audio"
        );

        const durationSeconds = this.recordingStartTime
          ? (Date.now() - this.recordingStartTime) / 1000
          : null;
        this.recordingStartTime = null;
        await this.processAudio(audioBlob, { durationSeconds });

        stream.getTracks().forEach((track) => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.onStateChange?.({ isRecording: true, isProcessing: false });
      this.scheduleRecordingOutputMute();

      return true;
    } catch (error) {
      await this.releaseRecordingOutputMute();
      let errorTitle = "Recording Error";
      let errorDescription = `Failed to access microphone: ${error.message}`;

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorTitle = "Microphone Access Denied";
        errorDescription =
          "Please grant microphone permission in your system settings and try again.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorTitle = "No Microphone Found";
        errorDescription = "No microphone was detected. Please connect a microphone and try again.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        errorTitle = "Microphone In Use";
        errorDescription =
          "The microphone is being used by another application. Please close other apps and try again.";
      }

      this.onError?.({
        title: errorTitle,
        description: errorDescription,
      });
      return false;
    }
  }

  stopRecording() {
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
      return true;
    }
    return false;
  }

  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.onstop = async () => {
        this.isRecording = false;
        this.isProcessing = false;
        this.audioChunks = [];
        this.recordingStartTime = null;
        this.onStateChange?.({ isRecording: false, isProcessing: false });
        await this.releaseRecordingOutputMute();
      };

      this.mediaRecorder.stop();

      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }

      return true;
    }
    return false;
  }

  cancelProcessing() {
    if (this.isProcessing) {
      this.isProcessing = false;
      this.onStateChange?.({ isRecording: false, isProcessing: false });
      return true;
    }
    return false;
  }

  async processAudio(audioBlob, metadata = {}) {
    const pipelineStart = performance.now();

    // Skip transcription if recording was silence
    const SILENCE_THRESHOLD = 0.01;
    if (this._peakRms != null && this._peakRms < SILENCE_THRESHOLD) {
      logger.info(
        "Silence detected, skipping transcription",
        { peakRms: this._peakRms.toFixed(4), threshold: SILENCE_THRESHOLD },
        "audio"
      );
      this._peakRms = null;
      this.isProcessing = false;
      this.onStateChange?.({ isRecording: false, isProcessing: false });
      this.onTranscriptionComplete?.({ success: true, text: "" });
      return;
    }
    this._peakRms = null;

    try {
      const s = getSettings();
      const useLocalWhisper = s.useLocalWhisper;
      const localProvider = s.localTranscriptionProvider;
      const whisperModel = s.whisperModel;
      const parakeetModel = s.parakeetModel || "parakeet-tdt-0.6b-v3";

      const cloudTranscriptionMode = s.cloudTranscriptionMode;
      const isSignedIn = s.isSignedIn;

      const isOpenWhisprCloudMode = !useLocalWhisper && cloudTranscriptionMode === "openwhispr";
      const useCloud = isOpenWhisprCloudMode && isSignedIn;
      logger.debug(
        "Transcription routing",
        { useLocalWhisper, useCloud, isSignedIn, cloudTranscriptionMode },
        "transcription"
      );

      let result;
      let activeModel;
      if (useLocalWhisper) {
        if (localProvider === "nvidia") {
          activeModel = parakeetModel;
          result = await this.processWithLocalParakeet(audioBlob, parakeetModel, metadata);
        } else {
          activeModel = whisperModel;
          result = await this.processWithLocalWhisper(audioBlob, whisperModel, metadata);
        }
      } else if (isOpenWhisprCloudMode) {
        if (!isSignedIn) {
          const err = new Error(
            "OpenWhispr Cloud requires sign-in. Please sign in again or switch to BYOK mode."
          );
          err.code = "AUTH_REQUIRED";
          throw err;
        }
        activeModel = "openwhispr-cloud";
        result = await this.processWithOpenWhisprCloud(audioBlob, metadata);
      } else {
        activeModel = this.getTranscriptionModel();
        result = await this.processWithOpenAIAPI(audioBlob, metadata);
      }

      if (!this.isProcessing) {
        return;
      }

      this.onTranscriptionComplete?.(result);

      if (result?.source === "openwhispr") {
        window.dispatchEvent(new Event("usage-changed"));
      }

      const roundTripDurationMs = Math.round(performance.now() - pipelineStart);

      const timingData = {
        mode: useLocalWhisper ? `local-${localProvider}` : "cloud",
        model: activeModel,
        audioDurationMs: metadata.durationSeconds
          ? Math.round(metadata.durationSeconds * 1000)
          : null,
        reasoningProcessingDurationMs: result?.timings?.reasoningProcessingDurationMs ?? null,
        roundTripDurationMs,
        audioSizeBytes: audioBlob.size,
        audioFormat: audioBlob.type,
        outputTextLength: result?.text?.length,
      };

      if (useLocalWhisper) {
        timingData.audioConversionDurationMs = result?.timings?.audioConversionDurationMs ?? null;
      }
      timingData.transcriptionProcessingDurationMs =
        result?.timings?.transcriptionProcessingDurationMs ?? null;

      logger.info("Pipeline timing", timingData, "performance");
    } catch (error) {
      const errorAtMs = Math.round(performance.now() - pipelineStart);

      logger.error(
        "Pipeline failed",
        {
          errorAtMs,
          error: error.message,
        },
        "performance"
      );

      if (error.message !== "No audio detected") {
        const isAsrGuardBlocked = error.code === "ASR_ANSWER_LIKE_OUTPUT";
        this.onError?.({
          title: isAsrGuardBlocked ? "Transcription Blocked" : "Transcription Error",
          description: isAsrGuardBlocked
            ? error.message
            : `Transcription failed: ${error.message}`,
          code: error.code,
        });
      }
    } finally {
      if (this.isProcessing) {
        this.isProcessing = false;
        this.onStateChange?.({ isRecording: false, isProcessing: false });
      }
    }
  }

  async processWithLocalWhisper(audioBlob, model = "base", metadata = {}) {
    const timings = {};

    try {
      // Send original audio to main process - FFmpeg in main process handles conversion
      // (renderer-side AudioContext conversion was unreliable with WebM/Opus format)
      const arrayBuffer = await audioBlob.arrayBuffer();
      const language = getBaseLanguageCode(getSettings().preferredLanguage);
      const options = { model };
      if (language) {
        options.language = language;
      }

      // Add custom dictionary as initial prompt to help Whisper recognize specific words
      const dictionaryPrompt = this.getCustomDictionaryPrompt();
      if (dictionaryPrompt) {
        options.initialPrompt = dictionaryPrompt;
      }

      logger.debug(
        "Local transcription starting",
        {
          audioFormat: audioBlob.type,
          audioSizeBytes: audioBlob.size,
        },
        "performance"
      );

      const transcriptionStart = performance.now();
      const result = await window.electronAPI.transcribeLocalWhisper(arrayBuffer, options);
      timings.transcriptionProcessingDurationMs = Math.round(
        performance.now() - transcriptionStart
      );

      logger.debug(
        "Local transcription complete",
        {
          transcriptionProcessingDurationMs: timings.transcriptionProcessingDurationMs,
          success: result.success,
        },
        "performance"
      );

      if (result.success && result.text) {
        const reasoningStart = performance.now();
        const text = await this.processTranscription(result.text, "local");
        timings.reasoningProcessingDurationMs = Math.round(performance.now() - reasoningStart);

        if (text !== null && text !== undefined) {
          return { success: true, text: text || result.text, source: "local", timings };
        } else {
          throw new Error("No text transcribed");
        }
      } else if (result.success === false && result.message === "No audio detected") {
        throw new Error("No audio detected");
      } else {
        throw new Error(result.message || result.error || "Local Whisper transcription failed");
      }
    } catch (error) {
      if (error.message === "No audio detected") {
        throw error;
      }

      const { allowOpenAIFallback, useLocalWhisper: isLocalMode } = getSettings();

      if (allowOpenAIFallback && isLocalMode) {
        try {
          const fallbackResult = await this.processWithOpenAIAPI(audioBlob, metadata);
          return { ...fallbackResult, source: "openai-fallback" };
        } catch (fallbackError) {
          throw new Error(
            `Local Whisper failed: ${error.message}. OpenAI fallback also failed: ${fallbackError.message}`
          );
        }
      } else {
        throw new Error(`Local Whisper failed: ${error.message}`);
      }
    }
  }

  async processWithLocalParakeet(audioBlob, model = "parakeet-tdt-0.6b-v3", metadata = {}) {
    const timings = {};

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const language = validateLanguageForModel(getSettings().preferredLanguage, model);
      const options = { model };
      if (language) {
        options.language = language;
      }

      logger.debug(
        "Parakeet transcription starting",
        {
          audioFormat: audioBlob.type,
          audioSizeBytes: audioBlob.size,
          model,
        },
        "performance"
      );

      const transcriptionStart = performance.now();
      const result = await window.electronAPI.transcribeLocalParakeet(arrayBuffer, options);
      timings.transcriptionProcessingDurationMs = Math.round(
        performance.now() - transcriptionStart
      );

      logger.debug(
        "Parakeet transcription complete",
        {
          transcriptionProcessingDurationMs: timings.transcriptionProcessingDurationMs,
          success: result.success,
        },
        "performance"
      );

      if (result.success && result.text) {
        const reasoningStart = performance.now();
        const text = await this.processTranscription(result.text, "local-parakeet");
        timings.reasoningProcessingDurationMs = Math.round(performance.now() - reasoningStart);

        if (text !== null && text !== undefined) {
          return { success: true, text: text || result.text, source: "local-parakeet", timings };
        } else {
          throw new Error("No text transcribed");
        }
      } else if (result.success === false && result.message === "No audio detected") {
        throw new Error("No audio detected");
      } else {
        throw new Error(result.message || result.error || "Parakeet transcription failed");
      }
    } catch (error) {
      if (error.message === "No audio detected") {
        throw error;
      }

      const { allowOpenAIFallback, useLocalWhisper: isLocalMode } = getSettings();

      if (allowOpenAIFallback && isLocalMode) {
        try {
          const fallbackResult = await this.processWithOpenAIAPI(audioBlob, metadata);
          return { ...fallbackResult, source: "openai-fallback" };
        } catch (fallbackError) {
          throw new Error(
            `Parakeet failed: ${error.message}. OpenAI fallback also failed: ${fallbackError.message}`
          );
        }
      } else {
        throw new Error(`Parakeet failed: ${error.message}`);
      }
    }
  }

  async getAPIKey() {
    const s = getSettings();
    const provider = s.cloudTranscriptionProvider || "openai";

    // Check cache (invalidate if provider changed)
    if (this.cachedApiKey !== null && this.cachedApiKeyProvider === provider) {
      return this.cachedApiKey;
    }

    let apiKey = null;

    if (provider === "custom") {
      // Prefer store value (user-entered via UI) over main process (.env)
      apiKey = s.customTranscriptionApiKey || "";
      if (!apiKey.trim()) {
        try {
          apiKey = await window.electronAPI.getCustomTranscriptionKey?.();
        } catch (err) {
          logger.debug(
            "Failed to get custom transcription key via IPC",
            { error: err?.message },
            "transcription"
          );
        }
      }
      apiKey = apiKey?.trim() || "";

      logger.debug(
        "Custom STT API key retrieval",
        {
          provider,
          hasKey: !!apiKey,
          keyLength: apiKey?.length || 0,
          keyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : "(none)",
        },
        "transcription"
      );

      // For custom, we allow null/empty - the endpoint may not require auth
      if (!apiKey) {
        apiKey = null;
      }
    } else if (provider === "mistral") {
      // Prefer store value (user-entered via UI) over main process (.env)
      // to avoid stale keys in process.env after auth mode transitions
      apiKey = s.mistralApiKey;
      if (!isValidApiKey(apiKey, "mistral")) {
        apiKey = await window.electronAPI.getMistralKey?.();
      }
      if (!isValidApiKey(apiKey, "mistral")) {
        throw new Error("Mistral API key not found. Please set your API key in the Control Panel.");
      }
    } else if (provider === "groq") {
      // Prefer store value (user-entered via UI) over main process (.env)
      apiKey = s.groqApiKey;
      if (!isValidApiKey(apiKey, "groq")) {
        apiKey = await window.electronAPI.getGroqKey?.();
      }
      if (!isValidApiKey(apiKey, "groq")) {
        throw new Error("Groq API key not found. Please set your API key in the Control Panel.");
      }
    } else {
      // Default to OpenAI
      // Prefer store value (user-entered via UI) over main process (.env)
      // to avoid stale keys in process.env after auth mode transitions
      apiKey = s.openaiApiKey;
      if (!isValidApiKey(apiKey, "openai")) {
        apiKey = await window.electronAPI.getOpenAIKey();
      }
      if (!isValidApiKey(apiKey, "openai")) {
        throw new Error(
          "OpenAI API key not found. Please set your API key in the .env file or Control Panel."
        );
      }
    }

    this.cachedApiKey = apiKey;
    this.cachedApiKeyProvider = provider;
    return apiKey;
  }

  async optimizeAudio(audioBlob) {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Convert to 16kHz mono for smaller size and faster upload
          const sampleRate = 16000;
          const channels = 1;
          const length = Math.floor(audioBuffer.duration * sampleRate);
          const offlineContext = new OfflineAudioContext(channels, length, sampleRate);

          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start();

          const renderedBuffer = await offlineContext.startRendering();
          const wavBlob = this.audioBufferToWav(renderedBuffer);
          resolve(wavBlob);
        } catch (error) {
          // If optimization fails, use original
          resolve(audioBlob);
        }
      };

      reader.onerror = () => resolve(audioBlob);
      reader.readAsArrayBuffer(audioBlob);
    });
  }

  audioBufferToWav(buffer) {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length * 2, true);

    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }

  async buildReasoningContext(text, agentName) {
    try {
      const targetApp = await getTargetAppInfo();
      const contextClassification = classifyContext({
        text,
        targetApp,
        agentName,
      });

      logger.logReasoning("REASONING_CONTEXT_CLASSIFIED", {
        context: contextClassification.context,
        intent: contextClassification.intent,
        confidence: contextClassification.confidence,
        strictMode: contextClassification.strictMode,
        strictOverlapThreshold: contextClassification.strictOverlapThreshold,
        targetApp: targetApp.appName || "unknown",
        source: targetApp.source,
        signals: contextClassification.signals,
      });

      return contextClassification;
    } catch (error) {
      logger.logReasoning("REASONING_CONTEXT_CLASSIFICATION_FAILED", {
        error: error.message,
      });
      return null;
    }
  }

  buildReasoningConfig(contextClassification) {
    const strictOverlapThreshold =
      Number(contextClassification?.strictOverlapThreshold) || DEFAULT_STRICT_OVERLAP_THRESHOLD;

    const config = {
      contextClassification: contextClassification || undefined,
      strictMode: contextClassification?.strictMode ?? true,
      strictOverlapThreshold,
    };

    if (this.isDarwinPlatform()) {
      config.strictShortInputThreshold = MAC_STRICT_SHORT_INPUT_THRESHOLD;
      config.allowSafeShortPolish = true;
      config.strictMaxExpansionRatio = MAC_STRICT_MAX_EXPANSION_RATIO;
      config.strictMinOutputCoverage = MAC_STRICT_MIN_OUTPUT_COVERAGE;
    }

    return config;
  }

  enforceCleanupOnlyReasoningContext(contextClassification) {
    if (!contextClassification) return null;

    const strictThreshold =
      Number(contextClassification?.strictOverlapThreshold) || DEFAULT_STRICT_OVERLAP_THRESHOLD;
    const signals = Array.isArray(contextClassification.signals)
      ? [...contextClassification.signals]
      : [];
    if (!signals.includes("intent:forced_cleanup_transcription")) {
      signals.push("intent:forced_cleanup_transcription");
    }

    const normalized = {
      ...contextClassification,
      intent: "cleanup",
      strictMode: true,
      strictOverlapThreshold: strictThreshold,
      signals,
    };

    logger.logReasoning("REASONING_CONTEXT_FORCED_CLEANUP", {
      context: normalized.context,
      intent: normalized.intent,
      strictMode: normalized.strictMode,
      strictOverlapThreshold: normalized.strictOverlapThreshold,
      targetApp: normalized?.targetApp?.appName || "unknown",
      signals: normalized.signals,
    });

    return normalized;
  }

  basicDictationCleanup(text) {
    if (typeof text !== "string") return "";
    return text
      .replace(/^[\s\u200B-\u200D\uFEFF]*(?:嗯+|呃+|额+|啊+|唉+|诶+|欸+)\s*[，,、]?\s*/g, "")
      .replace(/^[\u200B-\u200D\uFEFF]+/g, "")
      .replace(CHINESE_FILLER_WORD_RE, "$1")
      .replace(INLINE_CHINESE_FILLER_RE, "$1$2")
      .replace(ENGLISH_FILLER_WORD_RE, "")
      .replace(CHINESE_STUTTER_RE, "$1")
      .replace(INLINE_CHINESE_FUNCTION_WORD_STUTTER_RE, "$1$2$3")
      .replace(CHINESE_FUNCTION_WORD_STUTTER_RE, "$1$2")
      .replace(CHINESE_WORD_REPEAT_STUTTER_RE, "$1")
      .replace(ENGLISH_STUTTER_RE, "$1")
      .replace(/\s+([,.!?;:])/g, "$1")
      .replace(/\s+([，。！？、])/g, "$1")
      .replace(/([,.!?;:，。！？、])\1+/g, "$1")
      .replace(/([，,、])[，,、]+/g, "$1")
      .replace(/(^|[\n])\s*[，,、]+\s*/g, "$1")
      .replace(/\s+,/g, ",")
      .replace(/[，、]\s+/g, (match) => match.trim())
      .replace(/([A-Za-z0-9]),\s*([A-Za-z])/g, "$1, $2")
      .replace(/([，,、])([。！？!?])/g, "$2")
      .replace(/([。！？!?])[，,、]+/g, "$1")
      .replace(/[，,、](?=$|[\n])/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  getLocalStorageFlag(key, fallback = true) {
    if (typeof window === "undefined" || !window.localStorage) {
      return fallback;
    }

    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    if (raw === "false") return false;
    if (raw === "0") return false;
    if (raw === "off") return false;
    return true;
  }

  getCanonicalizerRuntimeOptions(source = "unknown") {
    const settings = getSettings();
    return {
      source,
      locale: settings.uiLanguage || "en",
      preferredLanguage: settings.preferredLanguage || "auto",
      canonicalizerEnabled: this.getLocalStorageFlag(FLAG_CANONICALIZER_ENABLED, true),
      numberEnabled: this.getLocalStorageFlag(FLAG_NUMBER_CANONICALIZER_ENABLED, true),
      punctuationEnabled: this.getLocalStorageFlag(FLAG_PUNCTUATION_CANONICALIZER_ENABLED, true),
    };
  }

  finalizeDictationOutput(text, source = "unknown") {
    const cleanedText = this.basicDictationCleanup(text);
    const runtimeOptions = this.getCanonicalizerRuntimeOptions(source);
    const isStreamingSource = source.includes("streaming");
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();

    const { text: canonicalizedText, stats } = canonicalizeDictationText(cleanedText, runtimeOptions);

    const elapsedMs = Number(
      (
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        start
      ).toFixed(3)
    );

    let canonicalizedFinal = canonicalizedText;
    if (isStreamingSource && elapsedMs > STREAMING_CANONICALIZER_HARD_LIMIT_MS) {
      canonicalizedFinal = cleanedText;
      logger.logReasoning("CANONICALIZER_SKIPPED_TIMEOUT", {
        source,
        elapsedMs,
        hardLimitMs: STREAMING_CANONICALIZER_HARD_LIMIT_MS,
        targetMs: STREAMING_CANONICALIZER_TARGET_MS,
      });
    } else {
      if (
        stats.enabled &&
        stats.chineseEnabled &&
        (stats.numberReplacements > 0 ||
          stats.punctuationReplacements > 0 ||
          stats.literalProtections > 0 ||
          stats.idiomProtections > 0 ||
          elapsedMs > STREAMING_CANONICALIZER_TARGET_MS)
      ) {
        logger.logReasoning("CANONICALIZER_APPLIED", {
          source,
          elapsedMs,
          targetMs: STREAMING_CANONICALIZER_TARGET_MS,
          numberReplacements: stats.numberReplacements,
          punctuationReplacements: stats.punctuationReplacements,
          literalProtections: stats.literalProtections,
          idiomProtections: stats.idiomProtections,
          dotConversions: stats.dotConversions,
        });
      }

      if (stats.literalProtections > 0) {
        logger.logReasoning("CANONICALIZER_LITERAL_PROTECTED", {
          source,
          elapsedMs,
          literalProtections: stats.literalProtections,
        });
      }
    }

    return this.applyDictionaryNormalization(canonicalizedFinal, `${source}-final`);
  }

  applyDictionaryNormalization(text, source = "unknown") {
    if (typeof text !== "string" || !text.trim()) return text;

    const dictionary = this.getCustomDictionaryArray();
    if (!Array.isArray(dictionary) || dictionary.length === 0) {
      return text;
    }

    const entries = buildDictionaryCanonicalEntries(dictionary);
    if (entries.length === 0) {
      return text;
    }

    const { text: normalizedText, replacements, matches } = applyDictionaryCanonicalization(
      text,
      entries
    );
    if (replacements > 0 && normalizedText !== text) {
      logger.logReasoning("DICTIONARY_CANONICALIZATION_APPLIED", {
        source,
        dictionarySize: dictionary.length,
        replacements,
        beforeLength: text.length,
        afterLength: normalizedText.length,
        matches,
      });
    }

    return normalizedText;
  }

  isExplicitAgentInstruction(text, agentName) {
    const normalizedText = typeof text === "string" ? text.trim() : "";
    const normalizedAgentName = typeof agentName === "string" ? agentName.trim() : "";
    if (!normalizedText || !normalizedAgentName) return false;

    const escapedName = escapeRegExp(normalizedAgentName);
    if (!escapedName) return false;

    const directAddress = new RegExp(
      `^(?:hey|hi|ok|okay|嘿|嗨|好|好的)?\\s*${escapedName}(?:\\s*[:,，：]\\s*|\\s+)(?:please\\s+)?`,
      "i"
    );

    return directAddress.test(normalizedText);
  }

  stripWakeAddressPrefix(text, agentName) {
    const normalizedText = typeof text === "string" ? text.trim() : "";
    const normalizedAgentName = typeof agentName === "string" ? agentName.trim() : "";
    if (!normalizedText || !normalizedAgentName) {
      return { text: normalizedText, stripped: false };
    }

    const escapedName = escapeRegExp(normalizedAgentName);
    if (!escapedName) {
      return { text: normalizedText, stripped: false };
    }

    const wakePrefix = new RegExp(
      `^(?:\\s*(?:hey|hi|ok|okay|嘿|嗨|喂|好|好的)\\s+)?${escapedName}(?:\\s*[:,，：]\\s*|\\s+)(?:please\\s+)?`,
      "i"
    );

    if (!wakePrefix.test(normalizedText)) {
      return { text: normalizedText, stripped: false };
    }

    const strippedText = normalizedText
      .replace(wakePrefix, "")
      .replace(/^([,，:：-]+)\s*/, "")
      .trim();

    return {
      text: strippedText,
      stripped: strippedText !== normalizedText,
    };
  }

  async processWithReasoningModel(text, model, agentName, config = {}) {
    logger.logReasoning("CALLING_REASONING_SERVICE", {
      model,
      agentName,
      textLength: text.length,
      context: config?.contextClassification?.context || "general",
      intent: config?.contextClassification?.intent || "cleanup",
      strictMode: config?.strictMode ?? config?.contextClassification?.strictMode ?? false,
    });

    const startTime = Date.now();

    try {
      const result = await ReasoningService.processText(text, model, agentName, config);

      const processingTime = Date.now() - startTime;

      logger.logReasoning("REASONING_SERVICE_COMPLETE", {
        model,
        processingTimeMs: processingTime,
        resultLength: result.length,
        success: true,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.logReasoning("REASONING_SERVICE_ERROR", {
        model,
        processingTimeMs: processingTime,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  async isReasoningAvailable() {
    if (typeof window === "undefined") {
      return false;
    }

    const useReasoning = getSettings().useReasoningModel;
    const now = Date.now();
    const cacheValid =
      this.reasoningAvailabilityCache &&
      now < this.reasoningAvailabilityCache.expiresAt &&
      this.cachedReasoningPreference === useReasoning;

    if (cacheValid) {
      return this.reasoningAvailabilityCache.value;
    }

    logger.logReasoning("REASONING_STORAGE_CHECK", {
      useReasoning,
    });

    if (!useReasoning) {
      this.reasoningAvailabilityCache = {
        value: false,
        expiresAt: now + REASONING_CACHE_TTL,
      };
      this.cachedReasoningPreference = useReasoning;
      return false;
    }

    if (isCloudReasoningMode()) {
      this.reasoningAvailabilityCache = {
        value: true,
        expiresAt: now + REASONING_CACHE_TTL,
      };
      this.cachedReasoningPreference = useReasoning;
      return true;
    }

    try {
      const isAvailable = await ReasoningService.isAvailable();

      logger.logReasoning("REASONING_AVAILABILITY", {
        isAvailable,
        reasoningEnabled: useReasoning,
        finalDecision: useReasoning && isAvailable,
      });

      this.reasoningAvailabilityCache = {
        value: isAvailable,
        expiresAt: now + REASONING_CACHE_TTL,
      };
      this.cachedReasoningPreference = useReasoning;

      return isAvailable;
    } catch (error) {
      logger.logReasoning("REASONING_AVAILABILITY_ERROR", {
        error: error.message,
        stack: error.stack,
      });

      this.reasoningAvailabilityCache = {
        value: false,
        expiresAt: now + REASONING_CACHE_TTL,
      };
      this.cachedReasoningPreference = useReasoning;
      return false;
    }
  }

  async processTranscription(text, source) {
    const normalizedText = typeof text === "string" ? text.trim() : "";
    const agentName =
      typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("agentName") || null
        : null;
    const wakePrefixCleanup = this.stripWakeAddressPrefix(normalizedText, agentName);
    const textForProcessing = wakePrefixCleanup.text;
    const finalizeFallbackOutput = () => this.finalizeDictationOutput(textForProcessing, source);

    if (wakePrefixCleanup.stripped) {
      logger.logReasoning("AGENT_WAKE_PREFIX_REMOVED", {
        source,
        agentName,
        beforeLength: normalizedText.length,
        afterLength: textForProcessing.length,
      });
    }

    if (!textForProcessing) {
      logger.logReasoning("TRANSCRIPTION_EMPTY_SKIPPING_REASONING", {
        source,
        reason: "Empty text after normalization",
      });
      return finalizeFallbackOutput();
    }

    logger.logReasoning("TRANSCRIPTION_RECEIVED", {
      source,
      textLength: textForProcessing.length,
      textPreview:
        textForProcessing.substring(0, 100) + (textForProcessing.length > 100 ? "..." : ""),
      timestamp: new Date().toISOString(),
    });

    const reasoningModel = getEffectiveReasoningModel();
    const isCloud = isCloudReasoningMode();
    const reasoningProvider = getSettings().reasoningProvider || "auto";
    if (!reasoningModel && !isCloud) {
      logger.logReasoning("REASONING_SKIPPED", {
        reason: "No reasoning model selected",
      });
      return finalizeFallbackOutput();
    }

    const useReasoning = await this.isReasoningAvailable();

    logger.logReasoning("REASONING_CHECK", {
      useReasoning,
      reasoningModel,
      reasoningProvider,
      agentName,
    });

    const explicitInstruction = this.isExplicitAgentInstruction(textForProcessing, agentName);
    if (explicitInstruction) {
      logger.logReasoning("AGENT_WAKE_PHRASE_DETECTED_CLEANUP_ONLY_ENFORCED", {
        source,
        textLength: textForProcessing.length,
        agentName,
      });
    }

    if (useReasoning) {
      try {
        logger.logReasoning("SENDING_TO_REASONING", {
          preparedTextLength: textForProcessing.length,
          model: reasoningModel,
          provider: reasoningProvider,
        });

        let contextClassification = await this.buildReasoningContext(textForProcessing, agentName);
        contextClassification = this.enforceCleanupOnlyReasoningContext(contextClassification);
        const result = await this.processWithReasoningModel(
          textForProcessing,
          reasoningModel,
          agentName,
          this.buildReasoningConfig(contextClassification)
        );

        logger.logReasoning("REASONING_SUCCESS", {
          resultLength: result.length,
          resultPreview: result.substring(0, 100) + (result.length > 100 ? "..." : ""),
          processingTime: new Date().toISOString(),
        });

        const postProcessed = this.finalizeDictationOutput(result, `${source}-reasoned`);
        if (postProcessed !== result) {
          logger.logReasoning("REASONING_POST_CLEANUP_APPLIED", {
            beforeLength: result.length,
            afterLength: postProcessed.length,
          });
        }
        return postProcessed;
      } catch (error) {
        logger.logReasoning("REASONING_FAILED", {
          error: error.message,
          stack: error.stack,
          fallbackToCleanup: true,
        });
        logger.warn("Reasoning failed", { source, error: error.message }, "notes");
      }
    }

    logger.logReasoning("USING_STANDARD_CLEANUP", {
      reason: useReasoning ? "Reasoning failed" : "Reasoning not enabled",
    });

    return finalizeFallbackOutput();
  }

  shouldStreamTranscription(model, provider) {
    if (provider !== "openai") {
      return false;
    }
    const normalized = typeof model === "string" ? model.trim() : "";
    if (!normalized || normalized === "whisper-1") {
      return false;
    }
    if (normalized === "gpt-4o-transcribe" || normalized === "gpt-4o-transcribe-diarize") {
      return true;
    }
    return normalized.startsWith("gpt-4o-mini-transcribe");
  }

  async fetchWithTimeout(endpoint, fetchOptions, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(endpoint, {
        ...fetchOptions,
        signal: controller.signal,
      });
    } catch (error) {
      const wasAborted = controller.signal.aborted || error?.name === "AbortError";
      if (wasAborted) {
        const timeoutError = new Error(
          `Transcription request timed out after ${Math.round(timeoutMs / 1000)}s`
        );
        timeoutError.code = "TRANSCRIPTION_TIMEOUT";
        timeoutError.endpoint = endpoint;
        timeoutError.timeoutMs = timeoutMs;
        throw timeoutError;
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async readTranscriptionStream(response) {
    const reader = response.body?.getReader();
    if (!reader) {
      logger.error("Streaming response body not available", {}, "transcription");
      throw new Error("Streaming response body not available");
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let collectedText = "";
    let finalText = null;
    let eventCount = 0;
    const eventTypes = {};

    const handleEvent = (payload) => {
      if (!payload || typeof payload !== "object") {
        return;
      }
      eventCount++;
      const eventType = payload.type || "unknown";
      eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;

      logger.debug(
        "Stream event received",
        {
          type: eventType,
          eventNumber: eventCount,
          payloadKeys: Object.keys(payload),
        },
        "transcription"
      );

      if (payload.type === "transcript.text.delta" && typeof payload.delta === "string") {
        collectedText += payload.delta;
        return;
      }
      if (payload.type === "transcript.text.segment" && typeof payload.text === "string") {
        collectedText += payload.text;
        return;
      }
      if (payload.type === "transcript.text.done" && typeof payload.text === "string") {
        finalText = payload.text;
        logger.debug(
          "Final transcript received",
          {
            textLength: payload.text.length,
          },
          "transcription"
        );
      }
    };

    logger.debug("Starting to read transcription stream", {}, "transcription");

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        logger.debug(
          "Stream reading complete",
          {
            eventCount,
            eventTypes,
            collectedTextLength: collectedText.length,
            hasFinalText: finalText !== null,
          },
          "transcription"
        );
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Log first chunk to see format
      if (eventCount === 0 && chunk.length > 0) {
        logger.debug(
          "First stream chunk received",
          {
            chunkLength: chunk.length,
            chunkPreview: chunk.substring(0, 500),
          },
          "transcription"
        );
      }

      // Process complete lines from the buffer
      // Each SSE event is "data: <json>\n" followed by empty line
      const lines = buffer.split("\n");
      buffer = "";

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines
        if (!trimmedLine) {
          continue;
        }

        // Extract data from "data: " prefix
        let data = "";
        if (trimmedLine.startsWith("data: ")) {
          data = trimmedLine.slice(6);
        } else if (trimmedLine.startsWith("data:")) {
          data = trimmedLine.slice(5).trim();
        } else {
          // Not a data line, could be leftover - keep in buffer
          buffer += line + "\n";
          continue;
        }

        // Handle [DONE] marker
        if (data === "[DONE]") {
          finalText = finalText ?? collectedText;
          continue;
        }

        // Try to parse JSON
        try {
          const parsed = JSON.parse(data);
          handleEvent(parsed);
        } catch (error) {
          // Incomplete JSON - put back in buffer for next iteration
          buffer += line + "\n";
        }
      }
    }

    const result = finalText ?? collectedText;
    logger.debug(
      "Stream processing complete",
      {
        resultLength: result.length,
        usedFinalText: finalText !== null,
        eventCount,
        eventTypes,
      },
      "transcription"
    );

    return result;
  }

  async processWithOpenWhisprCloud(audioBlob, metadata = {}) {
    if (!navigator.onLine) {
      const err = new Error("You're offline. Cloud transcription requires an internet connection.");
      err.code = "OFFLINE";
      throw err;
    }

    const timings = {};
    const settings = getSettings();

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioSizeBytes = audioBlob.size;
    const audioFormat = audioBlob.type;
    const opts = this.buildOpenWhisprCloudTranscribeOptions(settings);
    let result = null;
    let transcriptionProcessingDurationMs = 0;

    const runCloudTranscriptionAttempt = async () => {
      const transcriptionStart = performance.now();
      const response = await this.requestOpenWhisprCloudTranscription(arrayBuffer, opts);
      transcriptionProcessingDurationMs += Math.round(performance.now() - transcriptionStart);
      return response;
    };

    result = await runCloudTranscriptionAttempt();
    let processedText = result?.text || "";
    processedText = await this.guardMacAsrAnswerLikeOutput(processedText, {
      source: "openwhispr-cloud",
      retryOnce: async () => {
        const retryOpts = this.buildAnswerLikeRetryTranscribeOptions(settings);
        const transcriptionStart = performance.now();
        result = await this.requestOpenWhisprCloudTranscription(arrayBuffer, retryOpts);
        transcriptionProcessingDurationMs += Math.round(performance.now() - transcriptionStart);
        return result?.text || "";
      },
    });
    timings.transcriptionProcessingDurationMs = transcriptionProcessingDurationMs;

    // Process with reasoning if enabled
    const agentName = localStorage.getItem("agentName") || "";
    const wakePrefixCleanup = this.stripWakeAddressPrefix(processedText, agentName);
    if (wakePrefixCleanup.stripped) {
      logger.logReasoning("AGENT_WAKE_PREFIX_REMOVED", {
        source: "openwhispr-cloud",
        agentName,
        beforeLength: processedText.length,
        afterLength: wakePrefixCleanup.text.length,
      });
    }
    processedText = wakePrefixCleanup.text;

    if (settings.useReasoningModel && processedText && !this.skipReasoning) {
      const reasoningStart = performance.now();
      const explicitInstruction = this.isExplicitAgentInstruction(processedText, agentName);
      if (explicitInstruction) {
        logger.logReasoning("AGENT_WAKE_PHRASE_DETECTED_CLEANUP_ONLY_ENFORCED", {
          source: "openwhispr-cloud",
          textLength: processedText.length,
          agentName,
        });
      }
      const cloudReasoningMode = settings.cloudReasoningMode || "openwhispr";
      let contextClassification = await this.buildReasoningContext(processedText, agentName);
      contextClassification = this.enforceCleanupOnlyReasoningContext(contextClassification);
      const reasoningConfig = this.buildReasoningConfig(contextClassification);

      if (cloudReasoningMode === "openwhispr") {
        const reasonResult = await withSessionRefresh(async () => {
          const systemPrompt = getSystemPrompt(
            agentName,
            settings.customDictionary,
            settings.preferredLanguage || "auto",
            processedText,
            settings.uiLanguage || "en",
            contextClassification || undefined
          );
          logger.logReasoning("CLEANUP_REQUEST_SENT", {
            provider: "openwhispr-cloud",
            model: "openwhispr-cloud",
            retry: false,
            sourceLength: processedText.length,
            strictMode: reasoningConfig.strictMode ?? false,
            context: contextClassification?.context || "unknown",
            intent: contextClassification?.intent || "cleanup",
            hasCustomSystemPrompt: Boolean(systemPrompt),
          });
          const res = await window.electronAPI.cloudReason(buildCleanupUserMessage(processedText), {
            agentName,
            customDictionary: settings.customDictionary,
            systemPrompt,
            language: settings.preferredLanguage || "auto",
            locale: settings.uiLanguage || "en",
            sttProvider: result.sttProvider,
            sttModel: result.sttModel,
            sttProcessingMs: result.sttProcessingMs,
            sttWordCount: result.sttWordCount,
            sttLanguage: result.sttLanguage,
            audioDurationMs: result.audioDurationMs,
            audioSizeBytes,
            audioFormat,
          });
          if (!res.success) {
            const err = new Error(res.error || "Cloud reasoning failed");
            err.code = res.code;
            throw err;
          }
          return res;
        });

        if (reasonResult.success && reasonResult.text) {
          processedText = await ReasoningService.enforceStrictMode(
            processedText,
            reasonResult.text,
            reasoningConfig,
            "openwhispr-cloud",
            reasonResult.model || "openwhispr-cloud",
            agentName
          );
        }
      } else {
        const effectiveModel = getEffectiveReasoningModel();
        if (effectiveModel) {
          const result = await this.processWithReasoningModel(
            processedText,
            effectiveModel,
            agentName,
            reasoningConfig
          );
          if (result) {
            processedText = result;
          }
        }
      }
      timings.reasoningProcessingDurationMs = Math.round(performance.now() - reasoningStart);
    }

    processedText = this.finalizeDictationOutput(processedText, "openwhispr-cloud");

    return {
      success: true,
      text: processedText,
      source: "openwhispr",
      timings,
      limitReached: result.limitReached,
      wordsUsed: result.wordsUsed,
      wordsRemaining: result.wordsRemaining,
    };
  }

  getCustomDictionaryArray() {
    return getSettings().customDictionary;
  }

  getKeyterms() {
    return this.getCustomDictionaryArray();
  }

  async processWithOpenAIAPI(audioBlob, metadata = {}) {
    const timings = {};
    const apiSettings = getSettings();
    const language = getBaseLanguageCode(apiSettings.preferredLanguage);
    const allowLocalFallback = apiSettings.allowLocalFallback;
    const fallbackModel = apiSettings.fallbackWhisperModel || "base";

    try {
      const durationSeconds = metadata.durationSeconds ?? null;
      const shouldSkipOptimizationForDuration =
        typeof durationSeconds === "number" &&
        durationSeconds > 0 &&
        durationSeconds < SHORT_CLIP_DURATION_SECONDS;

      const model = this.getTranscriptionModel();
      const provider = apiSettings.cloudTranscriptionProvider || "openai";

      logger.debug(
        "Transcription request starting",
        {
          provider,
          model,
          blobSize: audioBlob.size,
          blobType: audioBlob.type,
          durationSeconds,
          language,
        },
        "transcription"
      );

      // gpt-4o-transcribe models don't support WAV format - they need webm, mp3, mp4, etc.
      // Only use WAV optimization for whisper-1 and groq models
      const is4oModel = model.includes("gpt-4o");
      const shouldOptimize =
        !is4oModel && !shouldSkipOptimizationForDuration && audioBlob.size > 1024 * 1024;

      logger.debug(
        "Audio optimization decision",
        {
          is4oModel,
          shouldOptimize,
          shouldSkipOptimizationForDuration,
        },
        "transcription"
      );

      const [apiKey, optimizedAudio] = await Promise.all([
        this.getAPIKey(),
        shouldOptimize ? this.optimizeAudio(audioBlob) : Promise.resolve(audioBlob),
      ]);

      // Determine the correct file extension based on the blob type
      const mimeType = optimizedAudio.type || "audio/webm";
      const extension = mimeType.includes("webm")
        ? "webm"
        : mimeType.includes("ogg")
          ? "ogg"
          : mimeType.includes("mp4")
            ? "mp4"
            : mimeType.includes("mpeg")
              ? "mp3"
              : mimeType.includes("wav")
                ? "wav"
                : "webm";

      // Add custom dictionary as prompt hint for cloud transcription
      const dictionaryPrompt = this.getCustomDictionaryPrompt();
      const shouldStream = this.shouldStreamTranscription(model, provider);
      const endpoint = this.getTranscriptionEndpoint();
      const isCustomProvider = provider === "custom";
      const isQwenAsr = isCustomProvider && isQwenAsrModel(model);
      const isCustomEndpoint =
        isCustomProvider ||
        (!endpoint.includes("api.openai.com") &&
          !endpoint.includes("api.groq.com") &&
          !endpoint.includes("api.mistral.ai"));
      const requestTimeoutMs = isCustomProvider
        ? NETWORK_TIMEOUTS.CUSTOM_TRANSCRIPTION_REQUEST_MS
        : NETWORK_TIMEOUTS.TRANSCRIPTION_REQUEST_MS;

      const apiCallStart = performance.now();

      // Mistral uses x-api-key auth (not Bearer) and doesn't allow browser CORS — proxy through main process
      if (provider === "mistral" && window.electronAPI?.proxyMistralTranscription) {
        const audioBuffer = await optimizedAudio.arrayBuffer();
        const proxyData = { audioBuffer, model, language };

        if (dictionaryPrompt) {
          const tokens = dictionaryPrompt
            .split(",")
            .flatMap((entry) => entry.trim().split(/\s+/))
            .filter(Boolean)
            .slice(0, 100);
          if (tokens.length > 0) {
            proxyData.contextBias = tokens;
          }
        }

        const result = await window.electronAPI.proxyMistralTranscription(proxyData);
        const proxyText = result?.text;

        if (proxyText && proxyText.trim().length > 0) {
          timings.transcriptionProcessingDurationMs = Math.round(performance.now() - apiCallStart);
          const reasoningStart = performance.now();
          const text = await this.processTranscription(proxyText, "mistral");
          timings.reasoningProcessingDurationMs = Math.round(performance.now() - reasoningStart);

          const source = (await this.isReasoningAvailable()) ? "mistral-reasoned" : "mistral";
          return { success: true, text, source, timings };
        }

        throw new Error("No text transcribed - Mistral response was empty");
      }

      // Custom endpoints may not support CORS — proxy through main process (same pattern as Mistral)
      if (isCustomProvider && window.electronAPI?.proxyCustomTranscription) {
        if (!endpoint.trim()) {
          throw new Error("Custom transcription endpoint is empty. Please configure it in Settings.");
        }

        const sourceSettings = getSettings();
        const retryPrompt = getAnswerLikeRetryPrompt(
          sourceSettings.customDictionary,
          sourceSettings.uiLanguage || "en"
        );
        const sourceTag = isQwenAsr ? "custom-qwen" : "custom";
        const baseAudioBuffer = await optimizedAudio.arrayBuffer();
        const runCustomProxyAttempt = async (promptOverride = null) => {
          const proxyData = {
            audioBuffer: baseAudioBuffer.slice(0),
            endpoint,
            model,
            language,
            mimeType,
            isQwenAsr,
          };
          if (!isQwenAsr) {
            const promptToUse =
              typeof promptOverride === "string" ? promptOverride : dictionaryPrompt;
            if (promptToUse) {
              proxyData.prompt = promptToUse;
            }
          }

          logger.debug(
            "Proxying custom transcription through main process",
            {
              endpoint,
              model,
              isQwenAsr,
              hasPrompt: !!proxyData.prompt,
              isRetryAttempt: typeof promptOverride === "string",
            },
            "transcription"
          );

          const result = await window.electronAPI.proxyCustomTranscription(proxyData);
          return isQwenAsr ? extractChatCompletionText(result) : result?.text;
        };

        let proxyText = await runCustomProxyAttempt();
        proxyText = await this.guardMacAsrAnswerLikeOutput(proxyText, {
          source: sourceTag,
          retryOnce: async () => runCustomProxyAttempt(isQwenAsr ? null : retryPrompt),
        });

        if (proxyText && proxyText.trim().length > 0) {
          timings.transcriptionProcessingDurationMs = Math.round(performance.now() - apiCallStart);
          const reasoningStart = performance.now();
          const text = await this.processTranscription(proxyText, "custom");
          timings.reasoningProcessingDurationMs = Math.round(performance.now() - reasoningStart);

          const source = (await this.isReasoningAvailable()) ? "custom-reasoned" : "custom";
          return { success: true, text, source, timings };
        }

        throw new Error("No text transcribed - custom endpoint response was empty");
      }

      if (isCustomProvider && !endpoint.trim()) {
        throw new Error("Custom transcription endpoint is empty. Please configure it in Settings.");
      }

      logger.debug(
        "Making transcription API request",
        {
          endpoint,
          shouldStream,
          model,
          provider,
          isQwenAsr,
          requestTimeoutMs,
          isCustomEndpoint,
          hasApiKey: !!apiKey,
          apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : "(none)",
        },
        "transcription"
      );

      // Build headers - only include Authorization if we have an API key
      const headers = {};
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      let requestEndpoint = endpoint;
      let response;

      if (isQwenAsr) {
        requestEndpoint = resolveCustomChatCompletionsEndpoint(endpoint);

        const audioBuffer = await optimizedAudio.arrayBuffer();
        const qwenMessages = [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: `data:${mimeType};base64,${arrayBufferToBase64(audioBuffer)}`,
                },
              },
            ],
          },
        ];
        const payload = {
          model,
          messages: qwenMessages,
          stream: false,
          asr_options: {
            enable_itn: false,
          },
        };

        logger.debug(
          "STT request details",
          {
            endpoint: requestEndpoint,
            method: "POST",
            hasAuthHeader: !!apiKey,
            payloadType: "chat-completions-input-audio",
            dictionaryIgnoredForQwen: !!dictionaryPrompt,
            dictionaryTermsCount: dictionaryPrompt
              ? dictionaryPrompt.split(",").map((s) => s.trim()).filter(Boolean).length
              : 0,
          },
          "transcription"
        );

        response = await this.fetchWithTimeout(
          requestEndpoint,
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
          requestTimeoutMs
        );
      } else {
        const formData = new FormData();
        formData.append("file", optimizedAudio, `audio.${extension}`);
        formData.append("model", model);

        if (language) {
          formData.append("language", language);
        }
        if (dictionaryPrompt) {
          formData.append("prompt", dictionaryPrompt);
        }
        if (shouldStream) {
          formData.append("stream", "true");
        }

        logger.debug(
          "STT request details",
          {
            endpoint: requestEndpoint,
            method: "POST",
            hasAuthHeader: !!apiKey,
            formDataFields: [
              "file",
              "model",
              language && language !== "auto" ? "language" : null,
              dictionaryPrompt ? "prompt" : null,
              shouldStream ? "stream" : null,
            ].filter(Boolean),
          },
          "transcription"
        );

        response = await this.fetchWithTimeout(
          requestEndpoint,
          {
            method: "POST",
            headers,
            body: formData,
          },
          requestTimeoutMs
        );
      }

      const responseContentType = response.headers.get("content-type") || "";

      logger.debug(
        "Transcription API response received",
        {
          status: response.status,
          statusText: response.statusText,
          contentType: responseContentType,
          ok: response.ok,
        },
        "transcription"
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          "Transcription API error response",
          {
            status: response.status,
            errorText,
          },
          "transcription"
        );
        throw new Error(`API Error: ${response.status} ${errorText}`);
      }

      let result;
      const contentType = responseContentType;

      if (!isQwenAsr && shouldStream && contentType.includes("text/event-stream")) {
        logger.debug("Processing streaming response", { contentType }, "transcription");
        const streamedText = await this.readTranscriptionStream(response);
        result = { text: streamedText };
        logger.debug(
          "Streaming response parsed",
          {
            hasText: !!streamedText,
            textLength: streamedText?.length,
          },
          "transcription"
        );
      } else {
        const rawText = await response.text();
        logger.debug(
          "Raw API response body",
          {
            rawText: rawText.substring(0, 1000),
            fullLength: rawText.length,
          },
          "transcription"
        );

        try {
          result = JSON.parse(rawText);
        } catch (parseError) {
          logger.error(
            "Failed to parse JSON response",
            {
              parseError: parseError.message,
              rawText: rawText.substring(0, 500),
            },
            "transcription"
          );
          throw new Error(`Failed to parse API response: ${parseError.message}`);
        }
      }

      const transcribedText = isQwenAsr ? extractChatCompletionText(result) : result?.text;

      logger.debug(
        "Parsed transcription result",
        {
          hasText: !!transcribedText,
          textLength: transcribedText?.length,
          resultKeys: result && typeof result === "object" ? Object.keys(result) : [],
        },
        "transcription"
      );

      // Check for text - handle both empty string and missing field
      if (transcribedText && transcribedText.trim().length > 0) {
        if (isAnswerLikeTranscriptionOutput(transcribedText)) {
          const err = new Error(
            "ASR returned assistant-style response instead of transcript. Check provider/model configuration."
          );
          err.code = "ASR_ANSWER_LIKE_OUTPUT";
          throw err;
        }

        timings.transcriptionProcessingDurationMs = Math.round(performance.now() - apiCallStart);

        const reasoningStart = performance.now();
        const text = await this.processTranscription(transcribedText, "openai");
        timings.reasoningProcessingDurationMs = Math.round(performance.now() - reasoningStart);

        const source = (await this.isReasoningAvailable()) ? "openai-reasoned" : "openai";
        logger.debug(
          "Transcription successful",
          {
            originalLength: transcribedText.length,
            processedLength: text.length,
            source,
            transcriptionProcessingDurationMs: timings.transcriptionProcessingDurationMs,
            reasoningProcessingDurationMs: timings.reasoningProcessingDurationMs,
          },
          "transcription"
        );
        return { success: true, text, source, timings };
      } else {
        // Log at info level so it shows without debug mode
        logger.info(
          "Transcription returned empty - check audio input",
          {
            model,
            provider,
            endpoint: requestEndpoint,
            blobSize: audioBlob.size,
            blobType: audioBlob.type,
            mimeType,
            extension,
            resultText: transcribedText,
            resultKeys: result && typeof result === "object" ? Object.keys(result) : [],
          },
          "transcription"
        );
        logger.error(
          "No text in transcription result",
          {
            result,
            resultKeys: result && typeof result === "object" ? Object.keys(result) : [],
          },
          "transcription"
        );
        throw new Error(
          "No text transcribed - audio may be too short, silent, or in an unsupported format"
        );
      }
    } catch (error) {
      let normalizedError = error;
      if (error?.code === "TRANSCRIPTION_TIMEOUT") {
        const timeoutSeconds = Math.max(
          1,
          Math.round((error.timeoutMs || NETWORK_TIMEOUTS.TRANSCRIPTION_REQUEST_MS) / 1000)
        );
        normalizedError = new Error(
          `Transcription request timed out after ${timeoutSeconds}s. The endpoint did not respond in time.`
        );
        normalizedError.code = "TRANSCRIPTION_TIMEOUT";
      }

      const isOpenAIMode = !getSettings().useLocalWhisper;

      if (allowLocalFallback && isOpenAIMode) {
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const options = { model: fallbackModel };
          if (language && language !== "auto") {
            options.language = language;
          }

          const result = await window.electronAPI.transcribeLocalWhisper(arrayBuffer, options);

          if (result.success && result.text) {
            const text = await this.processTranscription(result.text, "local-fallback");
            if (text) {
              return { success: true, text, source: "local-fallback" };
            }
          }
          throw normalizedError;
        } catch (fallbackError) {
          throw new Error(
            `OpenAI API failed: ${normalizedError.message}. Local fallback also failed: ${fallbackError.message}`
          );
        }
      }

      throw normalizedError;
    }
  }

  getTranscriptionModel() {
    try {
      const s = getSettings();
      const provider = s.cloudTranscriptionProvider || "openai";
      const trimmedModel = (s.cloudTranscriptionModel || "").trim();

      // For custom provider, use whatever model is set (or fallback to whisper-1)
      if (provider === "custom") {
        const isQwenFamilyModel = /^qwen[\w.-]*/i.test(trimmedModel);
        const isQwenAsrLikeModel = /(?:asr|audio)/i.test(trimmedModel);

        if (this.isDarwinPlatform() && isQwenFamilyModel && !isQwenAsrLikeModel) {
          const fallbackModel = "qwen3-asr-flash";
          logger.warn(
            "Custom transcription model appears non-ASR; auto-switching to ASR-capable Qwen model",
            { configuredModel: trimmedModel, fallbackModel },
            "transcription"
          );
          return fallbackModel;
        }

        return trimmedModel || "whisper-1";
      }

      // Validate model matches provider to handle settings migration
      if (trimmedModel) {
        const isGroqModel = trimmedModel.startsWith("whisper-large-v3");
        const isOpenAIModel = trimmedModel.startsWith("gpt-4o") || trimmedModel === "whisper-1";
        const isMistralModel = trimmedModel.startsWith("voxtral-");

        if (provider === "groq" && isGroqModel) {
          return trimmedModel;
        }
        if (provider === "openai" && isOpenAIModel) {
          return trimmedModel;
        }
        if (provider === "mistral" && isMistralModel) {
          return trimmedModel;
        }
        // Model doesn't match provider - fall through to default
      }

      // Return provider-appropriate default
      if (provider === "groq") return "whisper-large-v3-turbo";
      if (provider === "mistral") return "voxtral-mini-latest";
      return "gpt-4o-mini-transcribe";
    } catch (error) {
      return "gpt-4o-mini-transcribe";
    }
  }

  getTranscriptionEndpoint() {
    const s = getSettings();
    const currentProvider = s.cloudTranscriptionProvider || "openai";
    const currentBaseUrl = s.cloudTranscriptionBaseUrl || "";

    // Only use custom URL when provider is explicitly "custom"
    const isCustomEndpoint = currentProvider === "custom";

    // Invalidate cache if provider or base URL changed
    if (
      this.cachedTranscriptionEndpoint &&
      (this.cachedEndpointProvider !== currentProvider ||
        this.cachedEndpointBaseUrl !== currentBaseUrl)
    ) {
      logger.debug(
        "STT endpoint cache invalidated",
        {
          previousProvider: this.cachedEndpointProvider,
          newProvider: currentProvider,
          previousBaseUrl: this.cachedEndpointBaseUrl,
          newBaseUrl: currentBaseUrl,
        },
        "transcription"
      );
      this.cachedTranscriptionEndpoint = null;
    }

    if (this.cachedTranscriptionEndpoint) {
      return this.cachedTranscriptionEndpoint;
    }

    try {
      const cacheResult = (endpoint) => {
        this.cachedTranscriptionEndpoint = endpoint;
        this.cachedEndpointProvider = currentProvider;
        this.cachedEndpointBaseUrl = currentBaseUrl;

        logger.debug(
          "STT endpoint resolved",
          {
            endpoint,
            provider: currentProvider,
            isCustomEndpoint,
            usingDefault: endpoint === API_ENDPOINTS.TRANSCRIPTION,
          },
          "transcription"
        );

        return endpoint;
      };

      if (isCustomEndpoint) {
        const customEndpoint = currentBaseUrl.trim();
        if (customEndpoint) {
          logger.debug(
            "STT endpoint: using custom base URL as entered",
            {
              provider: currentProvider,
              endpoint: customEndpoint,
            },
            "transcription"
          );
          return cacheResult(customEndpoint);
        }

        logger.debug(
          "STT endpoint: custom provider has empty base URL, using default endpoint",
          {
            provider: currentProvider,
            rawBaseUrl: currentBaseUrl,
          },
          "transcription"
        );
        return cacheResult(API_ENDPOINTS.TRANSCRIPTION);
      }

      let base;
      if (currentProvider === "groq") {
        base = API_ENDPOINTS.GROQ_BASE;
      } else if (currentProvider === "mistral") {
        base = API_ENDPOINTS.MISTRAL_BASE;
      } else {
        // OpenAI or other standard providers
        base = API_ENDPOINTS.TRANSCRIPTION_BASE;
      }

      const normalizedBase = normalizeBaseUrl(base);
      if (!normalizedBase) {
        logger.debug(
          "STT endpoint: using default (normalization failed)",
          { rawBase: base },
          "transcription"
        );
        return cacheResult(API_ENDPOINTS.TRANSCRIPTION);
      }

      // Validate HTTPS for known provider endpoints.
      if (!isSecureEndpoint(normalizedBase)) {
        logger.warn(
          "STT endpoint: HTTPS required, falling back to default",
          { attemptedUrl: normalizedBase },
          "transcription"
        );
        return cacheResult(API_ENDPOINTS.TRANSCRIPTION);
      }

      let endpoint;
      if (/\/audio\/(transcriptions|translations)$/i.test(normalizedBase)) {
        endpoint = normalizedBase;
        logger.debug("STT endpoint: using full path from config", { endpoint }, "transcription");
      } else {
        endpoint = buildApiUrl(normalizedBase, "/audio/transcriptions");
        logger.debug(
          "STT endpoint: appending /audio/transcriptions to base",
          { base: normalizedBase, endpoint },
          "transcription"
        );
      }

      return cacheResult(endpoint);
    } catch (error) {
      logger.error(
        "STT endpoint resolution failed",
        { error: error.message, stack: error.stack },
        "transcription"
      );
      this.cachedTranscriptionEndpoint = API_ENDPOINTS.TRANSCRIPTION;
      this.cachedEndpointProvider = currentProvider;
      this.cachedEndpointBaseUrl = currentBaseUrl;
      return API_ENDPOINTS.TRANSCRIPTION;
    }
  }

  async safePaste(text, options = {}) {
    try {
      const result = await window.electronAPI.pasteText(text, options);
      if (result && typeof result === "object") {
        return result;
      }
      return {
        success: true,
        mode: "pasted",
      };
    } catch (error) {
      const message =
        error?.message ??
        (typeof error?.toString === "function" ? error.toString() : String(error));
      return {
        success: false,
        mode: "failed",
        message,
        reason: "paste_ipc_failed",
      };
    }
  }

  async saveTranscription(text) {
    try {
      await window.electronAPI.saveTranscription(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  getState() {
    return {
      isRecording: this.isRecording,
      isProcessing: this.isProcessing,
      isStreaming: this.isStreaming,
      isStreamingStartInProgress: this.streamingStartInProgress,
    };
  }

  shouldUseStreaming(isSignedInOverride) {
    const s = getSettings();
    const isSignedIn = isSignedInOverride ?? s.isSignedIn;
    if (s.useLocalWhisper || s.cloudTranscriptionMode !== "openwhispr" || !isSignedIn) {
      return false;
    }

    // For notes context, check user preference first
    if (this.context === "notes") {
      const userPref = localStorage.getItem("notesStreamingPreference");
      if (userPref === "streaming") return true;
      if (userPref === "batch") return false;
    }

    // Config-driven: check mode for this context
    if (this.sttConfig) {
      const contextConfig =
        this.context === "notes" ? this.sttConfig.notes : this.sttConfig.dictation;
      return contextConfig?.mode === "streaming";
    }

    // Fallback when config not yet loaded
    return localStorage.getItem("deepgramStreaming") !== "false";
  }

  async warmupStreamingConnection({ isSignedIn: isSignedInOverride } = {}) {
    if (!this.shouldUseStreaming(isSignedInOverride)) {
      logger.debug("Streaming warmup skipped - not in streaming mode", {}, "streaming");
      return false;
    }

    try {
      const provider = this.getStreamingProvider();
      const [, wsResult] = await Promise.all([
        this.cacheMicrophoneDeviceId(),
        withSessionRefresh(async () => {
          const warmupLang = getSettings().preferredLanguage;
          const res = await provider.warmup({
            sampleRate: 16000,
            language: warmupLang && warmupLang !== "auto" ? warmupLang : undefined,
            keyterms: this.getKeyterms(),
          });
          // Throw error to trigger retry if AUTH_EXPIRED
          if (!res.success && res.code) {
            const err = new Error(res.error || "Warmup failed");
            err.code = res.code;
            throw err;
          }
          return res;
        }),
      ]);

      if (wsResult.success) {
        // Pre-load AudioWorklet module so first recording is faster
        try {
          const audioContext = await this.getOrCreateAudioContext();
          if (!this.workletModuleLoaded) {
            await audioContext.audioWorklet.addModule(this.getWorkletBlobUrl());
            this.workletModuleLoaded = true;
            logger.debug("AudioWorklet module pre-loaded during warmup", {}, "streaming");
          }
        } catch (e) {
          logger.debug(
            "AudioWorklet pre-load failed (will retry on recording)",
            { error: e.message },
            "streaming"
          );
        }

        // Warm up the OS audio driver by briefly acquiring the mic, then releasing.
        // This forces macOS to initialize the audio subsystem so subsequent
        // getUserMedia calls resolve in ~100-200ms instead of ~500-1000ms.
        if (!this.micDriverWarmedUp) {
          try {
            const constraints = await this.getAudioConstraints();
            const tempStream = await navigator.mediaDevices.getUserMedia(constraints);
            tempStream.getTracks().forEach((track) => track.stop());
            this.micDriverWarmedUp = true;
            logger.debug("Microphone driver pre-warmed", {}, "streaming");
          } catch (e) {
            logger.debug(
              "Mic driver warmup failed (non-critical)",
              { error: e.message },
              "streaming"
            );
          }
        }

        logger.info(
          "Streaming connection warmed up",
          { alreadyWarm: wsResult.alreadyWarm, micCached: !!this.cachedMicDeviceId },
          "streaming"
        );
        return true;
      } else if (wsResult.code === "NO_API") {
        logger.debug("Streaming warmup skipped - API not configured", {}, "streaming");
        return false;
      } else {
        logger.warn("Streaming warmup failed", { error: wsResult.error }, "streaming");
        return false;
      }
    } catch (error) {
      logger.error("Streaming warmup error", { error: error.message }, "streaming");
      return false;
    }
  }

  async getOrCreateAudioContext() {
    if (this.persistentAudioContext && this.persistentAudioContext.state !== "closed") {
      if (this.persistentAudioContext.state === "suspended") {
        await this.persistentAudioContext.resume();
      }
      return this.persistentAudioContext;
    }
    this.persistentAudioContext = new AudioContext({ sampleRate: 16000 });
    this.workletModuleLoaded = false;
    return this.persistentAudioContext;
  }

  async startStreamingRecording() {
    try {
      if (this.streamingStartInProgress) {
        return false;
      }
      this.streamingStartInProgress = true;

      if (this.isRecording || this.isStreaming || this.isProcessing) {
        this.streamingStartInProgress = false;
        return false;
      }
      this.stopRequestedDuringStreamingStart = false;

      const t0 = performance.now();
      const constraints = await this.getAudioConstraints();
      const tConstraints = performance.now();

      // 1. Get mic stream (can take 10-15s on cold macOS mic driver)
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const tMedia = performance.now();

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        logger.info(
          "Streaming recording started with microphone",
          {
            label: audioTrack.label,
            deviceId: settings.deviceId?.slice(0, 20) + "...",
            sampleRate: settings.sampleRate,
            usedCachedId: !!this.cachedMicDeviceId,
          },
          "audio"
        );
      }

      // Start fallback recorder in case streaming produces no results
      try {
        this.streamingFallbackChunks = [];
        this.streamingFallbackRecorder = new MediaRecorder(stream);
        this.streamingFallbackRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.streamingFallbackChunks.push(e.data);
        };
        this.streamingFallbackRecorder.start();
      } catch (e) {
        logger.debug("Fallback recorder failed to start", { error: e.message }, "streaming");
        this.streamingFallbackRecorder = null;
      }

      // 2. Set up audio pipeline so frames flow the instant WebSocket is ready.
      //    Frames sent before WebSocket connects are silently dropped by sendAudio().
      const audioContext = await this.getOrCreateAudioContext();
      this.streamingAudioContext = audioContext;
      this.streamingSource = audioContext.createMediaStreamSource(stream);
      this.streamingStream = stream;

      if (!this.workletModuleLoaded) {
        await audioContext.audioWorklet.addModule(this.getWorkletBlobUrl());
        this.workletModuleLoaded = true;
      }

      this.streamingProcessor = new AudioWorkletNode(audioContext, "pcm-streaming-processor");
      const provider = this.getStreamingProvider();

      this.streamingProcessor.port.onmessage = (event) => {
        if (!this.isStreaming) return;
        provider.send(event.data);
      };

      this.isStreaming = true;
      this.streamingSource.connect(this.streamingProcessor);
      const tPipeline = performance.now();

      // 3. Register IPC event listeners BEFORE connecting, so no transcript
      //    events are lost during the connect handshake.
      this.streamingFinalText = "";
      this.streamingPartialText = "";
      this.streamingTextResolve = null;
      this.streamingTextDebounce = null;

      const partialCleanup = provider.onPartial((text) => {
        this.streamingPartialText = text;
        this.onPartialTranscript?.(text);
      });

      const finalCleanup = provider.onFinal((text) => {
        // text = accumulated final text from streaming provider.
        // Extract just the new segment (delta from previous accumulated final).
        const prevLen = this.streamingFinalText.length;
        this.streamingFinalText = text;
        this.streamingPartialText = "";
        const newSegment = text.slice(prevLen);
        if (newSegment) {
          this.onStreamingCommit?.(newSegment);
        }
      });

      const errorCleanup = provider.onError((error) => {
        logger.error("Streaming provider error", { error }, "streaming");
        this.onError?.({
          title: "Streaming Error",
          description: error,
        });
        if (this.isStreaming) {
          logger.warn("Connection lost during streaming, auto-stopping", {}, "streaming");
          this.stopStreamingRecording().catch((e) => {
            logger.error(
              "Auto-stop after connection loss failed",
              { error: e.message },
              "streaming"
            );
          });
        }
      });

      const sessionEndCleanup = provider.onSessionEnd((data) => {
        logger.debug("Streaming session ended", data, "streaming");
        if (data.text) {
          this.streamingFinalText = data.text;
        }
      });

      this.streamingCleanupFns = [partialCleanup, finalCleanup, errorCleanup, sessionEndCleanup];
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.onStateChange?.({ isRecording: true, isProcessing: false, isStreaming: true });

      // 4. Connect WebSocket — audio is already flowing from the pipeline above,
      //    so Deepgram receives data immediately (no idle timeout).
      const result = await withSessionRefresh(async () => {
        const preferredLang = getSettings().preferredLanguage;
        const res = await provider.start({
          sampleRate: 16000,
          language: preferredLang && preferredLang !== "auto" ? preferredLang : undefined,
          keyterms: this.getKeyterms(),
        });

        if (!res.success) {
          if (res.code === "NO_API") {
            return { needsFallback: true };
          }
          const err = new Error(res.error || "Failed to start streaming session");
          err.code = res.code;
          throw err;
        }
        return res;
      });
      const tWs = performance.now();

      if (result.needsFallback) {
        this.isRecording = false;
        this.recordingStartTime = null;
        this.stopRequestedDuringStreamingStart = false;
        await this.cleanupStreaming();
        this.onStateChange?.({ isRecording: false, isProcessing: false, isStreaming: false });
        this.streamingStartInProgress = false;
        logger.debug(
          "Streaming API not configured, falling back to regular recording",
          {},
          "streaming"
        );
        return this.startRecording();
      }

      logger.info(
        "Streaming start timing",
        {
          constraintsMs: Math.round(tConstraints - t0),
          getUserMediaMs: Math.round(tMedia - tConstraints),
          pipelineMs: Math.round(tPipeline - tMedia),
          wsConnectMs: Math.round(tWs - tPipeline),
          totalMs: Math.round(tWs - t0),
          usedWarmConnection: result.usedWarmConnection,
          micDriverWarmedUp: !!this.micDriverWarmedUp,
        },
        "streaming"
      );

      this.streamingStartInProgress = false;
      if (this.stopRequestedDuringStreamingStart) {
        this.stopRequestedDuringStreamingStart = false;
        logger.debug("Applying deferred streaming stop requested during startup", {}, "streaming");
        return this.stopStreamingRecording();
      }
      this.scheduleRecordingOutputMute();
      return true;
    } catch (error) {
      this.streamingStartInProgress = false;
      this.stopRequestedDuringStreamingStart = false;
      await this.releaseRecordingOutputMute();
      logger.error("Failed to start streaming recording", { error: error.message }, "streaming");

      let errorTitle = "Streaming Error";
      let errorDescription = `Failed to start streaming: ${error.message}`;

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorTitle = "Microphone Access Denied";
        errorDescription =
          "Please grant microphone permission in your system settings and try again.";
      } else if (error.code === "AUTH_EXPIRED" || error.code === "AUTH_REQUIRED") {
        errorTitle = "Sign-in Required";
        errorDescription =
          "Your OpenWhispr Cloud session is unavailable. Please sign in again from Settings.";
      }

      this.onError?.({
        title: errorTitle,
        description: errorDescription,
      });

      await this.cleanupStreaming();
      this.isRecording = false;
      this.recordingStartTime = null;
      this.onStateChange?.({ isRecording: false, isProcessing: false, isStreaming: false });
      return false;
    }
  }

  async stopStreamingRecording() {
    if (this.streamingStartInProgress) {
      this.stopRequestedDuringStreamingStart = true;
      logger.debug("Streaming stop requested while start is in progress", {}, "streaming");
      return true;
    }

    if (this.streamingStopInProgress) {
      logger.debug("Streaming stop already in progress, ignoring duplicate request", {}, "streaming");
      return true;
    }

    if (!this.isStreaming) return false;

    this.streamingStopInProgress = true;
    try {
      const durationSeconds = this.recordingStartTime
        ? (Date.now() - this.recordingStartTime) / 1000
        : null;

      const t0 = performance.now();
      let finalText = this.streamingFinalText || "";

    // 1. Update UI immediately
    this.isRecording = false;
    this.recordingStartTime = null;
    this.onStateChange?.({ isRecording: false, isProcessing: true, isStreaming: false });
    await this.releaseRecordingOutputMute();

    // 2. Stop the processor — it flushes its remaining buffer on "stop".
    //    Keep isStreaming TRUE so the port.onmessage handler forwards the flush to WebSocket.
    if (this.streamingProcessor) {
      try {
        this.streamingProcessor.port.postMessage("stop");
        this.streamingProcessor.disconnect();
      } catch (e) {
        // Ignore
      }
      this.streamingProcessor = null;
    }
    if (this.streamingSource) {
      try {
        this.streamingSource.disconnect();
      } catch (e) {
        // Ignore
      }
      this.streamingSource = null;
    }
    this.streamingAudioContext = null;

    // Stop fallback recorder before stopping media tracks
    let fallbackBlob = null;
    if (this.streamingFallbackRecorder?.state === "recording") {
      fallbackBlob = await new Promise((resolve) => {
        this.streamingFallbackRecorder.onstop = () => {
          const mimeType = this.streamingFallbackRecorder.mimeType || "audio/webm";
          resolve(new Blob(this.streamingFallbackChunks, { type: mimeType }));
        };
        this.streamingFallbackRecorder.stop();
      });
    }
    this.streamingFallbackRecorder = null;
    this.streamingFallbackChunks = [];

    if (this.streamingStream) {
      this.streamingStream.getTracks().forEach((track) => track.stop());
      this.streamingStream = null;
    }
    const tAudioCleanup = performance.now();

    // 3. Wait for flushed buffer to travel: port -> main thread -> IPC -> WebSocket -> server.
    //    Then mark streaming done so no further audio is forwarded.
    await new Promise((resolve) => setTimeout(resolve, 120));
    this.isStreaming = false;

    // 4. Finalize tells the provider to process any buffered audio and send final results.
    //    Wait briefly so the server sends back the finalized transcript before disconnect.
    const provider = this.getStreamingProvider();
    provider.finalize?.();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const tForceEndpoint = performance.now();

    const stopResult = await provider.stop().catch((e) => {
      logger.debug("Streaming disconnect error", { error: e.message }, "streaming");
      return { success: false };
    });
    const tTerminate = performance.now();

    finalText = this.streamingFinalText || "";

    if (!finalText && this.streamingPartialText) {
      finalText = this.streamingPartialText;
      logger.debug("Using partial text as fallback", { textLength: finalText.length }, "streaming");
    }

    if (!finalText && stopResult?.text) {
      finalText = stopResult.text;
      logger.debug(
        "Using disconnect result text as fallback",
        { textLength: finalText.length },
        "streaming"
      );
    }

    this.cleanupStreamingListeners();

    logger.info(
      "Streaming stop timing",
      {
        durationSeconds,
        audioCleanupMs: Math.round(tAudioCleanup - t0),
        flushWaitMs: Math.round(tForceEndpoint - tAudioCleanup),
        terminateRoundTripMs: Math.round(tTerminate - tForceEndpoint),
        totalStopMs: Math.round(tTerminate - t0),
        textLength: finalText.length,
      },
      "streaming"
    );

    const stSettings = getSettings();
    const streamingSttModel = stopResult?.model || "nova-3";
    const streamingSttProcessingMs = Math.round(tTerminate - t0);
    const streamingAudioBytesSent = stopResult?.audioBytesSent || 0;
    const streamingSttLanguage = getBaseLanguageCode(stSettings.preferredLanguage) || undefined;
    finalText = await this.guardMacAsrAnswerLikeOutput(finalText, {
      source: "openwhispr-streaming",
      retryOnce: async () => {
        if (!fallbackBlob?.size) {
          return finalText;
        }
        const retryBuffer = await fallbackBlob.arrayBuffer();
        const retryOpts = this.buildAnswerLikeRetryTranscribeOptions(stSettings);
        const retryResult = await this.requestOpenWhisprCloudTranscription(retryBuffer, retryOpts);
        return retryResult?.text || "";
      },
    });

    const streamingSttWordCount = finalText ? finalText.split(/\s+/).filter(Boolean).length : 0;
    const agentName = localStorage.getItem("agentName") || "";
    const wakePrefixCleanup = this.stripWakeAddressPrefix(finalText, agentName);
    if (wakePrefixCleanup.stripped) {
      logger.logReasoning("AGENT_WAKE_PREFIX_REMOVED", {
        source: "streaming",
        agentName,
        beforeLength: finalText.length,
        afterLength: wakePrefixCleanup.text.length,
      });
    }
    finalText = wakePrefixCleanup.text;

    let usedCloudReasoning = false;
    if (stSettings.useReasoningModel && finalText && !this.skipReasoning) {
      const reasoningStart = performance.now();
      const explicitInstruction = this.isExplicitAgentInstruction(finalText, agentName);
      if (explicitInstruction) {
        logger.logReasoning("AGENT_WAKE_PHRASE_DETECTED_CLEANUP_ONLY_ENFORCED", {
          source: "streaming",
          textLength: finalText.length,
          agentName,
        });
      }
      const cloudReasoningMode = stSettings.cloudReasoningMode || "openwhispr";
      let contextClassification = await this.buildReasoningContext(finalText, agentName);
      contextClassification = this.enforceCleanupOnlyReasoningContext(contextClassification);
      const reasoningConfig = this.buildReasoningConfig(contextClassification);

      try {
        if (cloudReasoningMode === "openwhispr") {
          const reasonResult = await withSessionRefresh(async () => {
            const systemPrompt = getSystemPrompt(
              agentName,
              stSettings.customDictionary,
              stSettings.preferredLanguage || "auto",
              finalText,
              stSettings.uiLanguage || "en",
              contextClassification || undefined
            );
            logger.logReasoning("CLEANUP_REQUEST_SENT", {
              provider: "openwhispr-cloud",
              model: "openwhispr-cloud",
              retry: false,
              sourceLength: finalText.length,
              strictMode: reasoningConfig.strictMode ?? false,
              context: contextClassification?.context || "unknown",
              intent: contextClassification?.intent || "cleanup",
              hasCustomSystemPrompt: Boolean(systemPrompt),
            });
            const res = await window.electronAPI.cloudReason(buildCleanupUserMessage(finalText), {
              agentName,
              customDictionary: stSettings.customDictionary,
              systemPrompt,
              language: stSettings.preferredLanguage || "auto",
              locale: stSettings.uiLanguage || "en",
              sttProvider: this.sttConfig?.streamingProvider || "deepgram",
              sttModel: streamingSttModel,
              sttProcessingMs: streamingSttProcessingMs,
              sttWordCount: streamingSttWordCount,
              sttLanguage: streamingSttLanguage,
              audioDurationMs: durationSeconds ? Math.round(durationSeconds * 1000) : undefined,
              audioSizeBytes: streamingAudioBytesSent || undefined,
              audioFormat: "linear16",
            });
            if (!res.success) {
              const err = new Error(res.error || "Cloud reasoning failed");
              err.code = res.code;
              throw err;
            }
            return res;
          });

          if (reasonResult.success && reasonResult.text) {
            finalText = await ReasoningService.enforceStrictMode(
              finalText,
              reasonResult.text,
              reasoningConfig,
              "openwhispr-cloud",
              reasonResult.model || "openwhispr-cloud",
              agentName
            );
          }
          usedCloudReasoning = true;

          logger.info(
            "Streaming reasoning complete",
            {
              reasoningDurationMs: Math.round(performance.now() - reasoningStart),
              model: reasonResult.model,
            },
            "streaming"
          );
        } else {
          const effectiveModel = getEffectiveReasoningModel();
          if (effectiveModel) {
            const result = await this.processWithReasoningModel(
              finalText,
              effectiveModel,
              agentName,
              reasoningConfig
            );
            if (result) {
              finalText = result;
            }
            logger.info(
              "Streaming BYOK reasoning complete",
              { reasoningDurationMs: Math.round(performance.now() - reasoningStart) },
              "streaming"
            );
          }
        }
      } catch (reasonError) {
        logger.error(
          "Streaming reasoning failed, using raw text",
          { error: reasonError.message },
          "streaming"
        );
      }
    }

    // If streaming produced no text, fall back to batch transcription
    // (batch fallback records usage server-side via /api/transcribe)
    let usedBatchFallback = false;
    if (!finalText && durationSeconds > 2 && fallbackBlob?.size > 0) {
      logger.info(
        "Streaming produced no text, falling back to batch transcription",
        { durationSeconds, blobSize: fallbackBlob.size },
        "streaming"
      );
      try {
        const batchResult = await this.processWithOpenWhisprCloud(fallbackBlob, {
          durationSeconds,
        });
        if (batchResult?.text) {
          finalText = batchResult.text;
          usedBatchFallback = true;
          logger.info("Batch fallback succeeded", { textLength: finalText.length }, "streaming");
        }
      } catch (fallbackErr) {
        logger.error("Batch fallback failed", { error: fallbackErr.message }, "streaming");
      }
    }

    if (finalText) {
      finalText = this.finalizeDictationOutput(finalText, "streaming-final");

      const tBeforePaste = performance.now();
      const clientTotalMs = Math.round(tBeforePaste - t0);
      this.onTranscriptionComplete?.({
        success: true,
        text: finalText,
        source: `${this.sttConfig?.streamingProvider || "deepgram"}-streaming`,
      });

      if (!usedBatchFallback) {
        (async () => {
          try {
            await withSessionRefresh(async () => {
              const res = await window.electronAPI.cloudStreamingUsage(
                finalText,
                durationSeconds ?? 0,
                {
                  sendLogs: !usedCloudReasoning,
                  sttProvider: this.sttConfig?.streamingProvider || "deepgram",
                  sttModel: streamingSttModel,
                  sttProcessingMs: streamingSttProcessingMs,
                  sttLanguage: streamingSttLanguage,
                  audioSizeBytes: streamingAudioBytesSent || undefined,
                  audioFormat: "linear16",
                  clientTotalMs,
                }
              );
              if (!res.success) {
                const err = new Error(res.error || "Streaming usage recording failed");
                err.code = res.code;
                throw err;
              }
            });
          } catch (err) {
            logger.error("Failed to report streaming usage", { error: err.message }, "streaming");
          }
          window.dispatchEvent(new Event("usage-changed"));
        })();
      } else {
        window.dispatchEvent(new Event("usage-changed"));
      }

      logger.info(
        "Streaming total processing",
        {
          totalProcessingMs: Math.round(tBeforePaste - t0),
          hasReasoning: stSettings.useReasoningModel,
        },
        "streaming"
      );
    }

      this.isProcessing = false;
      this.onStateChange?.({ isRecording: false, isProcessing: false, isStreaming: false });

      if (this.shouldUseStreaming()) {
        this.warmupStreamingConnection().catch((e) => {
          logger.debug("Background re-warm failed", { error: e.message }, "streaming");
        });
      }

      return true;
    } catch (error) {
      logger.error(
        "Failed to stop streaming recording",
        { error: error.message, code: error.code },
        "streaming"
      );

      const isAsrGuardBlocked = error.code === "ASR_ANSWER_LIKE_OUTPUT";
      this.onError?.({
        title: isAsrGuardBlocked ? "Transcription Blocked" : "Streaming Error",
        description: isAsrGuardBlocked
          ? error.message
          : `Failed to stop streaming: ${error.message}`,
        code: error.code,
      });

      await this.cleanupStreaming();
      this.isRecording = false;
      this.isProcessing = false;
      this.onStateChange?.({ isRecording: false, isProcessing: false, isStreaming: false });
      return false;
    } finally {
      this.streamingStopInProgress = false;
    }
  }

  cleanupStreamingAudio() {
    if (this.streamingFallbackRecorder?.state === "recording") {
      try {
        this.streamingFallbackRecorder.stop();
      } catch {}
    }
    this.streamingFallbackRecorder = null;
    this.streamingFallbackChunks = [];

    if (this.streamingProcessor) {
      try {
        this.streamingProcessor.port.postMessage("stop");
        this.streamingProcessor.disconnect();
      } catch (e) {
        // Ignore
      }
      this.streamingProcessor = null;
    }

    if (this.streamingSource) {
      try {
        this.streamingSource.disconnect();
      } catch (e) {
        // Ignore
      }
      this.streamingSource = null;
    }

    this.streamingAudioContext = null;

    if (this.streamingStream) {
      this.streamingStream.getTracks().forEach((track) => track.stop());
      this.streamingStream = null;
    }

    this.isStreaming = false;
  }

  cleanupStreamingListeners() {
    for (const cleanup of this.streamingCleanupFns) {
      try {
        cleanup?.();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    this.streamingCleanupFns = [];
    this.streamingFinalText = "";
    this.streamingPartialText = "";
    this.streamingTextResolve = null;
    clearTimeout(this.streamingTextDebounce);
    this.streamingTextDebounce = null;
  }

  async cleanupStreaming() {
    this.cleanupStreamingAudio();
    this.cleanupStreamingListeners();
    await this.releaseRecordingOutputMute();
  }

  cleanup() {
    void this.releaseRecordingOutputMute();
    if (this.isStreaming) {
      this.cleanupStreaming();
    }
    if (this.mediaRecorder?.state === "recording") {
      this.stopRecording();
    }
    if (this.persistentAudioContext && this.persistentAudioContext.state !== "closed") {
      this.persistentAudioContext.close().catch(() => {});
      this.persistentAudioContext = null;
      this.workletModuleLoaded = false;
    }
    if (this.workletBlobUrl) {
      URL.revokeObjectURL(this.workletBlobUrl);
      this.workletBlobUrl = null;
    }
    try {
      this.getStreamingProvider().stop?.();
    } catch (e) {
      // Ignore errors during cleanup (page may be unloading)
    }
    this.onStateChange = null;
    this.onError = null;
    this.onTranscriptionComplete = null;
    this.onPartialTranscript = null;
    this.onStreamingCommit = null;
    if (this._onApiKeyChanged) {
      window.removeEventListener("api-key-changed", this._onApiKeyChanged);
    }
  }
}

export default AudioManager;
