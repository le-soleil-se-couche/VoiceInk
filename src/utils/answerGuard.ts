const ANSWER_LIKE_TRANSCRIPTION_PATTERNS = [
  /(作为|身为).{0,10}(ai|语言模型|助手)/i,
  /(我无法|不能|不会|不可以).{0,18}(提供|协助|回答|满足|处理)/,
  /如果您想.{0,20}(测试|试试|尝试).{0,30}(语音转文字|转录|句子|示例)/,
  /\b(as an ai|as a language model)\b/i,
  /\b(i\s*(can't|cannot|am unable|won't))\b/i,
  /\b(if you want to test).{0,30}(speech[- ]to[- ]text|transcription)\b/i,
  /\b(you can try).{0,20}(sentence|example)\b/i,
];

const CHINESE_QUESTION_RE =
  /[？?]|(是不是|是否|会不会|能不能|可不可以|要不要|有没有|为什么|为何|怎么|怎样|如何|谁|什么|哪(个|里|儿)?|几|多少|吗|呢|么|嘛)/;
const ENGLISH_QUESTION_RE =
  /[?]|^\s*(?:what|why|how|when|where|who|which)\b|^\s*(?:can|could|would|should|is|are|am|was|were|do|does|did|will|won't|shall|have|has|had|may)\b/i;
const ENGLISH_QUESTION_END_RE = /\b(?:or\s+not|yes\s+or\s+no|right|correct|okay|ok)\s*$/i;
const ENGLISH_INDIRECT_QUESTION_RE =
  /\b(?:i\s+(?:wonder|was\s+wondering|want\s+to\s+know|need\s+to\s+know|am\s+curious)|curious)\s+(?:if|whether|why|how|what|when|where|who|which)\b|\b(?:please\s+)?(?:can|could|would)\s+you\s+(?:tell|check|confirm|explain|clarify)\s+(?:me\s+)?(?:if|whether|why|how|what|when|where|who|which)\b|\b(?:please\s+)?(?:let\s+me\s+know|tell\s+me|check|confirm|explain|clarify)\s+(?:if|whether|why|how|what|when|where|who|which)\b/i;
const CHINESE_A_NOT_A_QUESTION_RE = /([\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff])不\1/;
const TERMINAL_PUNCTUATION_RE = /[\s.,!?;:，。！？；：、】【""''()（）\[\]{}<>《》]+/g;
const CJK_CHAR_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const ASSISTANT_FOLLOW_UP_QUESTION_RE =
  /(请问|你想知道|您想知道|你是想问|您是想问|需要我|要我|我来|我可以帮你|我帮你|要不要我)/i;
const ASSISTANT_FOLLOW_UP_QUESTION_EN_RE =
  /\b(would you like|do you want me to|can i help|shall i|are you asking|would you like me to|do you want to know)\b/i;
const SENTENCE_SPLIT_RE = /(?:[。！？!?]+|\n+)/;

export function isAnswerLikeTranscriptionOutput(text: string | null | undefined): boolean {
  if (typeof text !== "string") return false;
  const trimmed = text.trim();
  if (trimmed.length < 20) return false;
  return ANSWER_LIKE_TRANSCRIPTION_PATTERNS.some((re) => re.test(trimmed));
}

export function isQuestionLikeDictation(text: string | null | undefined): boolean {
  if (typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    CHINESE_QUESTION_RE.test(trimmed) ||
    CHINESE_A_NOT_A_QUESTION_RE.test(trimmed) ||
    ENGLISH_QUESTION_RE.test(trimmed) ||
    ENGLISH_QUESTION_END_RE.test(trimmed) ||
    ENGLISH_INDIRECT_QUESTION_RE.test(trimmed)
  );
}

function normalizeForQuestionIntentCompare(text: string): string {
  return text.replace(TERMINAL_PUNCTUATION_RE, "").toLowerCase();
}

function tokenizeForQuestionIntentCompare(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  if (!normalized) return [];

  const rawTokens = normalized.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const token of rawTokens) {
    if (CJK_CHAR_RE.test(token)) {
      for (const char of token) {
        if (CJK_CHAR_RE.test(char)) {
          tokens.push(char);
        }
      }
      continue;
    }

    tokens.push(token);
  }

  return tokens;
}

function calculateQuestionIntentOverlap(inputText: string, outputText: string): number {
  const inputTokens = tokenizeForQuestionIntentCompare(inputText);
  const outputTokens = tokenizeForQuestionIntentCompare(outputText);
  if (!inputTokens.length || !outputTokens.length) return 0;

  const outputTokenSet = new Set(outputTokens);
  let overlapCount = 0;
  for (const token of inputTokens) {
    if (outputTokenSet.has(token)) {
      overlapCount += 1;
    }
  }

  return overlapCount / inputTokens.length;
}

function splitIntoSentencesForQuestionIntentCheck(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT_RE)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function containsMixedQuestionAndAnswerSentences(text: string): boolean {
  const sentences = splitIntoSentencesForQuestionIntentCheck(text);
  if (sentences.length < 2) {
    return false;
  }

  let hasQuestionSentence = false;
  let hasNonQuestionSentence = false;

  for (const sentence of sentences) {
    if (isQuestionLikeDictation(sentence)) {
      hasQuestionSentence = true;
      continue;
    }

    hasNonQuestionSentence = true;
  }

  return hasQuestionSentence && hasNonQuestionSentence;
}

export function shouldBlockQuestionAnswerization(
  inputText: string | null | undefined,
  outputText: string | null | undefined
): boolean {
  if (!isQuestionLikeDictation(inputText) || typeof outputText !== "string") {
    return false;
  }

  const normalizedOutput = outputText.trim();
  if (!normalizedOutput) {
    return true;
  }

  if (
    ASSISTANT_FOLLOW_UP_QUESTION_RE.test(normalizedOutput) ||
    ASSISTANT_FOLLOW_UP_QUESTION_EN_RE.test(normalizedOutput)
  ) {
    return true;
  }

  if (containsMixedQuestionAndAnswerSentences(normalizedOutput)) {
    return true;
  }

  if (isQuestionLikeDictation(normalizedOutput)) {
    const normalizedInput = typeof inputText === "string" ? inputText.trim() : "";
    if (
      normalizeForQuestionIntentCompare(normalizedInput) ===
      normalizeForQuestionIntentCompare(normalizedOutput)
    ) {
      return false;
    }

    return calculateQuestionIntentOverlap(normalizedInput, normalizedOutput) < 0.6;
  }

  const normalizedInput = typeof inputText === "string" ? inputText.trim() : "";
  return (
    normalizeForQuestionIntentCompare(normalizedInput) !==
    normalizeForQuestionIntentCompare(normalizedOutput)
  );
}
