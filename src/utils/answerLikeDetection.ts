const ANSWER_LIKE_PATTERNS = [
  /(作为|身为).{0,10}(ai|语言模型|助手)/i,
  /(我无法|不能|不会|不可以).{0,18}(提供|协助|回答|满足|处理)/,
  /^(?:我来|让我|我可以|我会|我能).{0,20}(?:处理|修改|整理|解释|说明|回答|发送|发给|重写|润色)/,
  /^(?:我来|让我|我可以|我会|我能).{0,12}(?:帮你|替你|为你|给你).{0,20}/,
  /(不用担心|别担心|我会尽力|我可以帮你|请告诉我|请问你|你想要).{0,40}/,
  /(?:要不要|是否需要).{0,12}(?:我|帮你|我来)/,
  /(?:需要|想要|希望).{0,6}(?:我|我来).{0,12}(?:帮你|处理|说明|解释|整理)/,
  /(对不起|抱歉).{0,20}(我会|我将|让我|我们)/,
  /你想要.{0,20}(什么|哪一个|哪两个|哪些)/,
  /如果您想.{0,20}(测试|试试|尝试).{0,30}(语音转文字|转录|句子|示例)/,
  /\b(as an ai|as a language model)\b/i,
  /\b(i\s*(can't|cannot|am unable|won't))\b/i,
  /^\s*(?:let me|i(?:'ll| will| can))\b.{0,30}\b(?:help|handle|explain|answer|rewrite|fix|edit|send|summarize|polish|clean up)\b/i,
  /\b(i can help|don't worry|please tell me|what can i)\b/i,
  /\b(i(?:'d| would)\s+be\s+happy\s+to)\b.{0,30}\b(?:help|rewrite|edit|polish|clean(?:\s+up)?|fix|summarize|answer|handle)\b/i,
  /^\s*happy\s+to\s+help\b/i,
  /\b(would you like me to|do you want me to|should i\b|can i help|how can i help|could you clarify|can you clarify)\b/i,
  /^\s*(?:what|which)\s+(?:would\s+you\s+like\s+to\s+(?:know|do|change|fix|rewrite|edit)|do\s+you\s+want\s+me\s+to\s+(?:do|change|fix|rewrite|edit))\b/i,
  /^\s*(?:tell\s+me|let\s+me\s+know)\s+what\s+(?:you\s+want|you(?:'d|\s+would)\s+like)\s+(?:to\s+(?:know|do|change|fix|rewrite|edit)|me\s+to\s+(?:do|change|fix|rewrite|edit))\b/i,
  /^\s*would\s+you\s+like\s+(?:the\s+|a\s+)?(?:polished|cleaned(?:[- ]up)?|rewritten|revised|updated)\s+(?:version|text|message|question)\b/i,
  /\b(?:please\s+)?(?:provide|share|send)\s+(?:me\s+)?(?:the\s+|your\s+)?(?:text|sentence|question|message|content)\s+(?:you(?:'d|\s+would)?\s+like\s+me\s+to)\s+(?:polish|rewrite|edit|clean(?:\s+up)?|fix|summarize|answer)\b/i,
  /^\s*(?:sure|okay|ok|alright|certainly|absolutely|of course)[,，]?\s+(?:what(?:'s| is)\s+your\s+(?:question|request)|how\s+can\s+i\s+help(?:\s+you)?|tell\s+me\s+what\s+you\s+need)\b/i,
  /\b(if you want to test).{0,30}(speech[- ]to[- ]text|transcription)\b/i,
  /\b(you can try).{0,20}(sentence|example)\b/i,
  /^\s*(?:sure|okay|ok|alright|certainly|absolutely|of course)[,，]?\s+(?:here(?:'s| is)|i(?:'ve| have)\s+(?:cleaned(?:[- ]up)?|polished|rewritten|revised|updated)|(?:this|that)\s+is)\b/i,
  /^\s*(?:(?:sure|okay|ok|alright|certainly|absolutely|of course)[,，]?\s+)?(?:here(?:'s| is)|below is)\s+(?:the|your|a)\s+(?:(?:more|slightly)\s+)?(?:polished|cleaned(?:[- ]up)?|rewritten|revised|updated)\s+(?:version|question|text|message)\s*[:：-]/i,
  /^\s*the\s+(?:(?:more|slightly)\s+)?(?:polished|cleaned(?:[- ]up)?|rewritten|revised|updated)\s+(?:version|question|text|message)\s+is\s*[:：-]/i,
  /^\s*(?:(?:more|slightly)\s+)?(?:polished|cleaned(?:[- ]up)?|rewritten|revised|updated)\s+(?:version|question|text|message)\s*[:：-]/i,
  /^\s*(?:好的|好呀|行|当然可以|没问题)[，,]?(?:请说|请讲|请告诉我|你可以说|我来帮你|我可以帮你)(?:吧|呀|呢)?/,
  /^\s*(?:好的|好呀|行|当然可以|没问题)[，,]?(?:这(?:是|里)|以下)\s*(?:是)?(?:润色后|修改后|整理后|重写后)的(?:版本|内容|问题|文本)\s*[:：]/,
  /^\s*(?:润色后|修改后|整理后|重写后)的(?:版本|内容|问题|文本)\s*[:：]/,
];

const HIGH_CONFIDENCE_ANSWER_LIKE_PATTERNS = [
  /(?:^|\b)(?:answer\s+is|the\s+answer\s+is)\b/i,
  /(?:答案|结果)(?:是|为)[:：]?\s*[-+]?\d+(?:\.\d+)?(?:[。.!！？?]|$)/,
  /^\s*[-+]?\d+(?:\.\d+)?(?:\s*[+\-*/x×÷]\s*[-+]?\d+(?:\.\d+)?)+(?:\s*(?:=|等于)\s*)[-+]?\d+(?:\.\d+)?(?:[。.!！？?]|$)/,
];

const HAN_CHAR_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

function getWeightedTextLength(text: string): number {
  let length = 0;

  for (const char of text) {
    length += HAN_CHAR_RE.test(char) ? 2 : 1;
  }

  return length;
}

export function isAnswerLikeText(text: string, minimumLength = 6): boolean {
  if (!text || !text.trim()) {
    return false;
  }

  const trimmed = text.trim();
  if (HIGH_CONFIDENCE_ANSWER_LIKE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  if (getWeightedTextLength(trimmed) < minimumLength) {
    return false;
  }

  return ANSWER_LIKE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export { ANSWER_LIKE_PATTERNS, HIGH_CONFIDENCE_ANSWER_LIKE_PATTERNS };
