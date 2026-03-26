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
  /[?]|^\s*(?:what|why|how|when|where|who|which)\b|^\s*(?:can|could|would|should|is|are|am|do|does|did|will|won't|shall)\b/i;
const TERMINAL_PUNCTUATION_RE = /[\s.,!?;:，。！？；：、】【""''()（）\[\]{}<>《》]+/g;

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
  return CHINESE_QUESTION_RE.test(trimmed) || ENGLISH_QUESTION_RE.test(trimmed);
}

function normalizeForQuestionIntentCompare(text: string): string {
  return text.replace(TERMINAL_PUNCTUATION_RE, "").toLowerCase();
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

  if (isQuestionLikeDictation(normalizedOutput)) {
    return false;
  }

  const normalizedInput = typeof inputText === "string" ? inputText.trim() : "";
  return (
    normalizeForQuestionIntentCompare(normalizedInput) !==
    normalizeForQuestionIntentCompare(normalizedOutput)
  );
}
