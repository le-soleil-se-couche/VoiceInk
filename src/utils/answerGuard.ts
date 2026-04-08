const ANSWER_LIKE_TRANSCRIPTION_PATTERNS = [
  /(作为|身为).{0,10}(ai|语言模型|助手)/i,
  /(我无法|不能|不会|不可以).{0,18}(提供|协助|回答|满足|处理)/,
  /如果您想.{0,20}(测试|试试|尝试).{0,30}(语音转文字|转录|句子|示例)/,
  /\b(as an ai|as a language model)\b/i,
  /\b(i\s*(can't|cannot|am unable|won't))\b/i,
  /\b(if you want to test).{0,30}(speech[- ]to[- ]text|transcription)\b/i,
  /\b(you can try).{0,20}(sentence|example)\b/i,
  // Summary-style patterns for non-code document contexts
  /\b(in summary|to summarize|here's? a summary)\b/i,
  /\bhere('s| is)? (the|your|this|what) (you )?(clean|polished|formatted|revised|cleaned|organized|dictated)\b/i,
  /\b(below is (the|your)|the following is (the|your))\b/i,
  /\b(i('?ve| have) (clean|polish|format|organize|revis|summariz)(ed|d|ing|ted) (up )?(your|the|my) )\b/i,
  // Additional answer-like patterns: let-me constructions and conclusion markers
  /\b(let me (summarize|review|explain|clarify|rephrase|rewrite|clean|polish|format|organize))\b/i,
  /\b(i will (summarize|review|explain|clarify|rephrase|rewrite|clean|polish|format|organize))\b/i,
  /\b(i'll (summarize|review|explain|clarify|rephrase|rewrite|clean|polish|format|organize))\b/i,
  /\b(in conclusion|to conclude|to wrap up|to sum up)\b/i,
  /\b(my (response|answer|suggestion|recommendation) (is|would be))\b/i,
  /\b(based on (your|the) (input|dictation|notes|text|content))\b/i,
];

const CHINESE_QUESTION_RE =
  /[？?]|(是不是|是否|会不会|能不能|可不可以|要不要|有没有|为什么|为何|怎么|怎样|如何|谁|什么|哪(个|里|儿)?|几|多少|吗|呢|么|嘛)/;
const ENGLISH_QUESTION_RE =
  /[?]|^\s*(?:what|why|how|when|where|who|which)(?:['’]s)?\b|^\s*(?:can|could|would|should|is|are|am|was|were|do|does|did|will|won't|shall|have|has|had|may)\b/i;
const ENGLISH_QUESTION_END_RE = /\b(?:or\s+not|yes\s+or\s+no|right|correct|okay|ok)\s*$/i;
const ENGLISH_TAG_QUESTION_RE =
  /,\s*(?:isn['’]?t|aren['’]?t|wasn['’]?t|weren['’]?t|doesn['’]?t|don['’]?t|didn['’]?t|hasn['’]?t|haven['’]?t|hadn['’]?t|won['’]?t|wouldn['’]?t|couldn['’]?t|shouldn['’]?t|can['’]?t|ain['’]?t)\s+(?:i|you|he|she|it|we|they|there|that|this)\s*$/i;
const ENGLISH_INDIRECT_QUESTION_RE =
  /\b(?:(?:i\s+)?(?:wonder|was\s+wondering|want\s+to\s+know|wanted\s+to\s+know|need\s+to\s+know|needed\s+to\s+know|would\s+like\s+to\s+know|am\s+curious)|(?:just\s+|still\s+)?wondering|curious)\s+(?:if|whether|why|how|what|when|where|who|which)\b|\b(?:please\s+)?(?:can|could|would)\s+you\s+(?:tell|check|confirm|explain|clarify|advise|verify|find\s+out)\s+(?:me\s+)?(?:if|whether|why|how|what|when|where|who|which)\b|\b(?:please\s+)?(?:let\s+me\s+know|tell\s+me|check|confirm|explain|clarify|advise|verify|find\s+out)\s+(?:if|whether|why|how|what|when|where|who|which)\b/i;
const ENGLISH_IMPERATIVE_VERIFICATION_RE =
  /^\s*(?:please\s+)?(?:confirm|check|verify|advise)\s+(?:that\s+)?(?=.*\b(?:is|are|was|were|has|have|had|did|do|does|can|could|will|would|should|finished|done|ready|working|fixed|updated|deployed|merged|passed|failed|correct|available)\b).+/i;
const CHINESE_A_NOT_A_QUESTION_RE = /([\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff])不\1/;
const TERMINAL_PUNCTUATION_RE = /[\s.,!?;:，。！？；：、】【""''()（）\[\]{}<>《》]+/g;
const CJK_CHAR_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const ASSISTANT_FOLLOW_UP_QUESTION_RE =
  /(请问|你想知道|您想知道|你是想问|您是想问|需要我|要我|我来|我可以帮你|我帮你|要不要我)/i;
const ASSISTANT_FOLLOW_UP_QUESTION_EN_RE =
  /\b(would you like|do you want me to|can i help|shall i|are you asking|would you like me to|do you want to know)\b/i;
const QUESTION_REFRAMING_PREFIX_RE =
  /^\s*(?:(?:please\s+)?(?:(?:can|could|would|will|do|did)\s+you\s+(?:tell|check|confirm|explain|clarify|advise|verify|let\s+me\s+know|share|know)\b)|(?:(?:please\s+)?(?:tell|let)\s+me\s+know\b)|(?:do|did)\s+you\s+know\b)/i;
const QUESTION_REFRAMING_PREFIX_ZH_RE =
  /^\s*(?:请问|你知道|您知道|你能告诉我|您能告诉我|你可以告诉我|您可以告诉我|请告诉我|麻烦告诉我|能不能告诉我|可不可以告诉我)/i;
const INDIRECT_QUESTION_REFRAMING_PREFIX_EN_RE =
  /^\s*(?:(?:i\s+)?(?:wonder|was\s+wondering|want\s+to\s+know|wanted\s+to\s+know|need\s+to\s+know|needed\s+to\s+know|would\s+like\s+to\s+know|am\s+curious)|(?:just\s+|still\s+)?wondering|curious)\s+(?:if|whether|why|how|what|when|where|who|which)\b/i;
const IMPERATIVE_QUESTION_REFRAMING_PREFIX_EN_RE =
  /^\s*(?:please\s+)?(?:tell\s+me|let\s+me\s+know|check|confirm|explain|clarify|advise|verify|find\s+out)\s+(?:if|whether|why|how|what|when|where|who|which)\b/i;
const SENTENCE_SPLIT_RE = /(?:[。！？!?]+|\n+)/;
const CLAUSE_SPLIT_RE = /[，,;；:：]+/;

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
    ENGLISH_TAG_QUESTION_RE.test(trimmed) ||
    ENGLISH_INDIRECT_QUESTION_RE.test(trimmed) ||
    ENGLISH_IMPERATIVE_VERIFICATION_RE.test(trimmed)
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

function containsQuestionThenAnswerClauses(text: string): boolean {
  const clauses = text
    .split(CLAUSE_SPLIT_RE)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (clauses.length < 2) {
    return false;
  }

  for (let index = 0; index < clauses.length - 1; index += 1) {
    if (!isQuestionLikeDictation(clauses[index])) {
      continue;
    }

    for (let followIndex = index + 1; followIndex < clauses.length; followIndex += 1) {
      const followClause = clauses[followIndex];
      if (isQuestionLikeDictation(followClause)) {
        continue;
      }

      if (tokenizeForQuestionIntentCompare(followClause).length >= 2) {
        return true;
      }
    }
  }

  return false;
}

function hasQuestionReframingPrefix(text: string): boolean {
  return (
    QUESTION_REFRAMING_PREFIX_RE.test(text) ||
    QUESTION_REFRAMING_PREFIX_ZH_RE.test(text) ||
    INDIRECT_QUESTION_REFRAMING_PREFIX_EN_RE.test(text) ||
    IMPERATIVE_QUESTION_REFRAMING_PREFIX_EN_RE.test(text)
  );
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

  if (containsQuestionThenAnswerClauses(normalizedOutput)) {
    return true;
  }

  if (isQuestionLikeDictation(normalizedOutput)) {
    const normalizedInput = typeof inputText === "string" ? inputText.trim() : "";
    if (
      hasQuestionReframingPrefix(normalizedOutput) &&
      !hasQuestionReframingPrefix(normalizedInput)
    ) {
      return true;
    }

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

// Code and structured content detection
const CODE_FENCE_RE = /```[\s\S]*?```/;
const INLINE_CODE_RE = /`[^`]+`/;
const HTML_TAG_RE = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^>]*?)?\s*\/?>/;
const JSX_TAG_RE = /<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^>]*?)?\s*\/?>/;
const CODE_KEYWORD_RE = /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|def|import|package|public|private|protected|interface|type|enum|namespace|module|struct|impl|trait|fn|match|yield|try|catch|throw|new|this|super|extends|implements|typeof|instanceof|keyof|readonly|as|in|of|void|null|undefined|true|false|None|True|False|nil|TRUE|FALSE)\b/;
const CODE_OPERATOR_RE = /(?:=>|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%]=?|&=|\|=|\^=|<<=|>>=|>>>=|~|\?\.|\?\?|::|->|<-|::=|:=)/;
const CODE_BLOCK_INDICATORS_RE = /(?:^|\n)\s*(?:function\s+\w+|class\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|def\s+\w+|import\s+|export\s+|from\s+|require\(|\[\s*\]|\{\s*\}|\{\s*\n)/;
const JSON_STRUCTURE_RE = /^\s*[\[\{]\s*(?:"[^"]+"\s*:|[^"\s])/;
const YAML_STRUCTURE_RE = /^(?:---|\.\.\.|[\w-]+:\s*\S)/m;
const SQL_KEYWORD_RE = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|ON|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|UNION|ALL|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CREATE|TABLE|ALTER|DROP|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|NOT NULL|UNIQUE|CHECK|CASCADE|TRUNCATE|EXISTS|BETWEEN|IN|LIKE|IS NULL|IS NOT NULL)\b/i;
const FILE_PATH_RE = /(?:^|\s)(?:[\/~][\w.\-\/]+|[A-Za-z]:\\[\w.\\\-]+)(?:\s|$)/;
const URL_PATTERN_RE = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/i;

export function hasCodeOrStructuredContent(text: string | null | undefined): boolean {
  if (typeof text !== "string" || !text.trim()) {
    return false;
  }

  const trimmed = text.trim();
  
  // Short text is unlikely to contain meaningful code/structured content
  if (trimmed.length < 3) {
    return false;
  }

  return (
    CODE_FENCE_RE.test(trimmed) ||
    INLINE_CODE_RE.test(trimmed) ||
    HTML_TAG_RE.test(trimmed) ||
    JSX_TAG_RE.test(trimmed) ||
    CODE_KEYWORD_RE.test(trimmed) ||
    CODE_OPERATOR_RE.test(trimmed) ||
    CODE_BLOCK_INDICATORS_RE.test(trimmed) ||
    JSON_STRUCTURE_RE.test(trimmed) ||
    YAML_STRUCTURE_RE.test(trimmed) ||
    SQL_KEYWORD_RE.test(trimmed) ||
    FILE_PATH_RE.test(trimmed) ||
    URL_PATTERN_RE.test(trimmed)
  );
}

export function shouldBlockCodeOrStructuredContentRewrite(
  source: string | null | undefined,
  output: string | null | undefined
): boolean {
  // Only applies when source has code/structured content
  if (!hasCodeOrStructuredContent(source)) {
    return false;
  }

  // If output also has code/structured content, check if it's been rewritten into prose
  if (typeof output !== "string" || !output.trim()) {
    return true;
  }

  const sourceHasCode = hasCodeOrStructuredContent(source);
  const outputHasCode = hasCodeOrStructuredContent(output);

  // Source has code but output doesn't - likely rewritten into prose
  if (sourceHasCode && !outputHasCode) {
    return true;
  }

  // Both have code - check if code fence content was converted to inline
  const sourceHasFence = CODE_FENCE_RE.test(source);
  const outputHasFence = CODE_FENCE_RE.test(output);
  
  if (sourceHasFence && !outputHasFence) {
    return true;
  }

  return false;
}
