export function hasUnresolvedAlternativeChoice(text?: string): boolean {
  if (!text || !text.trim()) {
    return false;
  }

  const normalized = text.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized.includes("还是")) {
    return false;
  }

  const ignorePrefixes = /^(?:我|你|他|她|它|我们|你们|他们|她们|它们|后来|最后|最终|结果|其实|但|但是|不过)/;
  if (ignorePrefixes.test(normalized)) {
    return false;
  }

  const parts = normalized.split("还是");
  if (parts.length !== 2) {
    return false;
  }

  const [before, after] = parts;
  if (before.length < 2 || after.length < 1) {
    return false;
  }

  const likelyStillUsage = /^(?:觉得|认为|希望|可以|不行|行|稳|好|对|错|要|会|能|是|有|在)/;
  if (likelyStillUsage.test(after)) {
    return false;
  }

  return /[\u4e00-\u9fffA-Za-z0-9]/.test(before) && /[\u4e00-\u9fffA-Za-z0-9]/.test(after);
}

export function isQuestionLikeDictation(text?: string): boolean {
  if (!text || !text.trim()) {
    return false;
  }

  const normalized = text.trim().toLowerCase();
  if (/[?？]$/.test(normalized)) {
    return true;
  }

  const zhQuantityQuestionPattern =
    /(?:等于几|差几|第几|几个|几次|几天|几年|几月|几号|几点|几分|几秒|几页|几行|几种|几台|几层|几级|几块|几位|几项|几条|几句|几遍|几小时)(?=$|[\u4e00-\u9fffA-Za-z0-9])/;
  const zhQuestionPatterns = [
    /[吗么呢吧]$/,
    /(?:为什么|为何|怎么|怎样)(?=[\u4e00-\u9fffA-Za-z0-9])/,
    /(?:什么|谁|多少|几时|几点|是否)(?=$|[\u4e00-\u9fffA-Za-z0-9])/,
    /哪(?:里|儿|个|些|种|边|款|家|位)?(?=$|[\u4e00-\u9fffA-Za-z0-9])/,
    /(?:是不是|能不能|可不可以|要不要|会不会|有没有)/,
    /(?:行不行|对不对|好不好|可不可以|能不能|要不要|有没有|是不是)$/,
    /([\u4e00-\u9fff]{1,4})不\1$/,
    zhQuantityQuestionPattern,
  ];

  if (zhQuestionPatterns.some((re) => re.test(normalized))) {
    return true;
  }

  const enQuestionStart =
    /^(?:what|when|where|why|who|whom|whose|which|how|is|are|am|was|were|do|does|did|can|could|would|should|will|have|has|had|may)\b/;
  if (enQuestionStart.test(normalized)) {
    return true;
  }

  const enQuestionEnd = /\b(?:or\s+not|right|correct|okay|ok)\s*$/;
  if (enQuestionEnd.test(normalized)) {
    return true;
  }

  if (/\b(?:what|when|where|why|who|whom|whose|which|how)\b/.test(normalized)) {
    return true;
  }

  return hasUnresolvedAlternativeChoice(normalized);
}
