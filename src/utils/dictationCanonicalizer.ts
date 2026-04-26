export interface DictationCanonicalizerOptions {
  locale?: string | null;
  preferredLanguage?: string | null;
  source?: string | null;
  customDictionary?: string[];
  canonicalizerEnabled?: boolean;
  numberEnabled?: boolean;
  punctuationEnabled?: boolean;
}

export interface DictationCanonicalizerStats {
  enabled: boolean;
  chineseEnabled: boolean;
  source: string;
  locale: string;
  preferredLanguage: string;
  numberEnabled: boolean;
  punctuationEnabled: boolean;
  numberReplacements: number;
  punctuationReplacements: number;
  literalProtections: number;
  idiomProtections: number;
  dotConversions: number;
  dictionaryProtections: number;
  dictionaryCorrections: number;
}

export interface DictationCanonicalizerResult {
  text: string;
  stats: DictationCanonicalizerStats;
}

const DEFAULT_LOCALE = "en";
const DEFAULT_LANGUAGE = "auto";
const DEFAULT_SOURCE = "unknown";
const HAN_CHAR_RE = /[\u4e00-\u9fff]/g;
const HAN_CHAR_SINGLE_RE = /[\u4e00-\u9fff]/;
const LATIN_CHAR_RE = /[A-Za-z]/;

const CHINESE_DIGIT_VALUES: Record<string, number> = {
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

const CHINESE_UNIT_VALUES: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
  万: 10000,
  萬: 10000,
};

const CHINESE_NUMBER_SEQUENCE_RE = /[零〇一二两三四五六七八九十百千万萬]+/g;
const CHINESE_NUMBER_UNIT_CHAR_RE = /[十百千万萬]/;
const CHINESE_SPOKEN_NUMBER_RE = /^[零〇一二两三四五六七八九十百千万萬\d]+/;
const CHINESE_QUANTIFIER_SUFFIX_RE =
  /(?:个|位|名|条|项|份|台|次|句|行|段|年|月|周|天|日|号|点|分|秒|时|钟|元|块|币|￥|¥|度|℃|公里|里|米|厘米|毫米|千克|公斤|克|%|％|版|章|节|页|级|本|件|篇|集|层|届|期|套|辆)/;
const SENTENCE_END_PUNCT_WORD_RE = /(句号|逗号|问号|感叹号|冒号|分号|顿号)(?=(?:\s|$|\n))/g;
const DECIMAL_SPOKEN_RE = /([零〇一二两三四五六七八九\d]+)点([零〇一二两三四五六七八九\d]+)/g;
const DOT_TLD_RE = /点(com|cn|net|org|io|ai|dev|app|co|gov|edu)\b/gi;
const SAFE_FORWARD_SLASH_RE = /([A-Za-z0-9._~-])(斜杠|杠)([A-Za-z0-9._~-])/g;
const SAFE_BACK_SLASH_RE = /([A-Za-z0-9._~-])反斜杠([A-Za-z0-9._~-])/g;
const QWEN_ASR_CONFUSION_PATTERNS: RegExp[] = [
  /(?:10000000|1\s*0\s*0\s*0\s*0\s*0\s*0\s*0)\s*(?:个|问)?\s*a\s*\.?\s*s\s*\.?\s*r/gi,
  /(?:1000|1\s*0\s*0\s*0)\s*问\s*a\s*\.?\s*s\s*\.?\s*r/gi,
];

const PUNCTUATION_WORD_TO_SYMBOL: Record<string, string> = {
  句号: "。",
  逗号: "，",
  问号: "？",
  感叹号: "！",
  冒号: "：",
  分号: "；",
  顿号: "、",
};

const LITERAL_TERMS = [
  "句号",
  "逗号",
  "问号",
  "感叹号",
  "冒号",
  "分号",
  "顿号",
  "点",
  "斜杠",
  "反斜杠",
  "杠",
];

const DICTIONARY_CONFUSION_GROUPS = [
  ["爱", "艾"],
  ["弥", "米", "迷"],
  ["斯", "丝", "思"],
  ["鸣", "明", "名", "命"],
  ["潮", "巢", "朝"],
  ["终", "中"],
  ["末", "墨", "莫"],
  ["地", "的"],
  ["舟", "州", "周"],
];

const DICTIONARY_CONFUSION_CANONICALS = new Map<string, string>(
  DICTIONARY_CONFUSION_GROUPS.flatMap((group) => group.map((char) => [char, group[0]]))
);

type ChineseDictionaryTerm = {
  compact: string;
  comparable: string;
};

const IDIOM_PROTECTIONS = [
  "一心一意",
  "一举两得",
  "一干二净",
  "一清二楚",
  "一石二鸟",
  "一模一样",
  "一唱一和",
  "一来二去",
  "一知半解",
  "二话不说",
  "三心二意",
  "三番五次",
  "三长两短",
  "四面八方",
  "五光十色",
  "五花八门",
  "五湖四海",
  "六神无主",
  "七上八下",
  "七嘴八舌",
  "八仙过海",
  "九牛一毛",
  "九死一生",
  "十拿九稳",
  "十全十美",
  "百发百中",
  "千方百计",
  "千真万确",
  "万无一失",
];
const ORAL_ONE_NEXT_RE = /^[下些样起直会]/;
const ORAL_ONE_PREV_RE = /[这那哪每另前后上下同某]/;
const TIME_CONTEXT_PREV_RE = /[上下早晚晨午夜今明昨零〇一二两三四五六七八九十百千万萬\d]/;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizedLanguage = (language?: string | null) =>
  typeof language === "string" && language.trim() ? language.trim() : DEFAULT_LANGUAGE;

const normalizedLocale = (locale?: string | null) =>
  typeof locale === "string" && locale.trim() ? locale.trim() : DEFAULT_LOCALE;

const normalizedSource = (source?: string | null) =>
  typeof source === "string" && source.trim() ? source.trim() : DEFAULT_SOURCE;

const countHanChars = (value: string): number => (value.match(HAN_CHAR_RE) || []).length;

const compactDictionaryTerm = (value: string): string => value.replace(/\s+/g, "");

const normalizeDictionaryComparable = (value: string): string =>
  [...compactDictionaryTerm(value)]
    .map((char) => DICTIONARY_CONFUSION_CANONICALS.get(char) || char)
    .join("");

const normalizeDictionaryCandidateComparable = (
  candidate: string,
  term: ChineseDictionaryTerm
): string => {
  const phraseAdjusted = term.compact.includes("终末")
    ? candidate.replace(/周末/g, "终末")
    : candidate;
  return normalizeDictionaryComparable(phraseAdjusted);
};

const getChineseDictionaryTerms = (customDictionary?: string[]): ChineseDictionaryTerm[] => {
  if (!customDictionary?.length) return [];

  const seen = new Set<string>();
  const terms: ChineseDictionaryTerm[] = [];

  for (const rawTerm of customDictionary) {
    const exact = typeof rawTerm === "string" ? rawTerm.trim() : "";
    const compact = compactDictionaryTerm(exact);
    if (!compact || !hasAnyHanChars(compact)) continue;
    if (!/^[\u4e00-\u9fff]+$/.test(compact)) continue;
    if (compact.length < 2 || compact.length > 16) continue;
    if (seen.has(compact)) continue;

    seen.add(compact);
    terms.push({
      compact,
      comparable: normalizeDictionaryComparable(compact),
    });
  }

  return terms.sort((a, b) => b.compact.length - a.compact.length);
};

const countDifferentChars = (left: string, right: string): number => {
  let count = 0;
  const limit = Math.min(left.length, right.length);
  for (let i = 0; i < limit; i += 1) {
    if (left[i] !== right[i]) count += 1;
  }
  return count + Math.abs(left.length - right.length);
};

const isDictionaryNearMiss = (candidate: string, term: ChineseDictionaryTerm): boolean => {
  if (candidate === term.compact) return false;
  if (candidate.length !== term.compact.length) return false;
  if (normalizeDictionaryCandidateComparable(candidate, term) !== term.comparable) return false;

  const diffCount = countDifferentChars(candidate, term.compact);
  if (diffCount === 0) return false;
  if (term.compact.length <= 2) {
    return diffCount <= 2 && !candidate.includes("的");
  }
  if (term.compact.length === 3) {
    return diffCount <= 2;
  }

  return diffCount <= Math.max(1, Math.floor(term.compact.length / 3));
};

const repairDictionaryTermsInHanRun = (
  run: string,
  terms: ChineseDictionaryTerm[],
  stats: DictationCanonicalizerStats
): string => {
  let next = run;

  for (const term of terms) {
    const length = term.compact.length;
    if (next.length < length) continue;

    let rebuilt = "";
    let index = 0;
    while (index < next.length) {
      const candidate = next.slice(index, index + length);
      if (candidate.length === length && isDictionaryNearMiss(candidate, term)) {
        rebuilt += term.compact;
        index += length;
        stats.dictionaryCorrections += 1;
        continue;
      }

      rebuilt += next[index];
      index += 1;
    }
    next = rebuilt;
  }

  return next;
};

const repairCustomDictionaryTerms = (
  value: string,
  terms: ChineseDictionaryTerm[],
  stats: DictationCanonicalizerStats
): string => {
  if (terms.length === 0) return value;
  return value.replace(/[\u4e00-\u9fff]+/g, (run) =>
    repairDictionaryTermsInHanRun(run, terms, stats)
  );
};

const protectCustomDictionaryTerms = (
  value: string,
  terms: ChineseDictionaryTerm[],
  placeholders: Map<string, string>,
  stats: DictationCanonicalizerStats
): string => {
  let protectedText = value;
  for (const term of terms) {
    const pattern = new RegExp([...term.compact].map(escapeRegExp).join("\\s*"), "g");
    protectedText = protectedText.replace(pattern, () => {
      const token = `__CANON_DICT_${placeholders.size}__`;
      placeholders.set(token, term.compact);
      stats.dictionaryProtections += 1;
      return token;
    });
  }
  return protectedText;
};

const isChineseContextEnabled = (value: string, preferredLanguage: string): boolean => {
  if (preferredLanguage === "zh-CN" || preferredLanguage === "zh-TW") {
    return true;
  }

  if (preferredLanguage !== "auto") {
    return false;
  }

  const compact = value.replace(/\s+/g, "");
  if (!compact) return false;
  const hanCount = countHanChars(compact);
  const ratio = hanCount / Math.max(1, compact.length);
  return ratio > 0.2;
};

const parseChineseNumberWords = (segment: string): string | null => {
  if (!segment || typeof segment !== "string") return null;

  let total = 0;
  let section = 0;
  let currentDigit = 0;
  let seenNumberToken = false;
  let hasUnit = false;

  for (const char of segment) {
    if (Object.prototype.hasOwnProperty.call(CHINESE_DIGIT_VALUES, char)) {
      currentDigit = CHINESE_DIGIT_VALUES[char];
      seenNumberToken = true;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(CHINESE_UNIT_VALUES, char)) {
      const unit = CHINESE_UNIT_VALUES[char];
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

    if (/\d/.test(char)) {
      // Mixed Arabic + Chinese digits are handled by dedicated patterns, keep raw here.
      return null;
    }

    return null;
  }

  if (!seenNumberToken) return null;

  if (!hasUnit) {
    const digits = [...segment]
      .map((char) => CHINESE_DIGIT_VALUES[char])
      .filter((value) => Number.isFinite(value));
    if (digits.length !== segment.length) return null;
    return String(Number(digits.join("")));
  }

  return String(total + section + currentDigit);
};

const toArabicNumeral = (value: string) => parseChineseNumberWords(value) ?? value;

const normalizeChineseDateExpressions = (value: string) =>
  value
    .replace(
      /([零〇一二两三四五六七八九十百千万萬]{2,})\s*年\s*([零〇一二两三四五六七八九十百千万萬]{1,3})\s*月\s*([零〇一二两三四五六七八九十百千万萬]{1,3})\s*(日|号)/g,
      (_match, yearText, monthText, dayText, suffix) =>
        `${toArabicNumeral(yearText)}年${toArabicNumeral(monthText)}月${toArabicNumeral(dayText)}${suffix}`
    )
    .replace(
      /([零〇一二两三四五六七八九十百千万萬]{1,3})\s*月\s*([零〇一二两三四五六七八九十百千万萬]{1,3})\s*(日|号)/g,
      (_match, monthText, dayText, suffix) =>
        `${toArabicNumeral(monthText)}月${toArabicNumeral(dayText)}${suffix}`
    );

const shouldSkipShortNumberSegment = ({
  segment,
  previousChar,
  nextChar,
  sourceText,
  offset,
}: {
  segment: string;
  previousChar: string;
  nextChar: string;
  sourceText: string;
  offset: number;
}) => {
  if (segment.length > 2) return false;
  if (segment === "一" && ORAL_ONE_NEXT_RE.test(nextChar || "")) return true;
  if (segment === "一" && ORAL_ONE_PREV_RE.test(previousChar || "")) return true;
  if (segment === "一" && nextChar === "点") {
    const tail = sourceText.slice(offset + segment.length + 1).trim();
    if (TIME_CONTEXT_PREV_RE.test(previousChar || "")) return false;
    if (/^[零〇一二两三四五六七八九十百千万萬\d]+(?:分|时|秒|鐘|钟)/.test(tail)) return false;
    if (CHINESE_SPOKEN_NUMBER_RE.test(tail)) return false;
    return true;
  }
  if (previousChar === "第") return true;
  if (nextChar === ".") return false;
  if (nextChar === "/") return false;
  if (nextChar === "个" && !CHINESE_NUMBER_UNIT_CHAR_RE.test(segment)) return true;
  if (LATIN_CHAR_RE.test(previousChar) || LATIN_CHAR_RE.test(nextChar)) return true;
  if (sourceText.slice(Math.max(0, offset - 3), offset).endsWith("分之")) return false;
  return !CHINESE_QUANTIFIER_SUFFIX_RE.test(nextChar || "");
};

const normalizeSpokenChineseNumbersWithContext = (value: string, stats: DictationCanonicalizerStats) =>
  value.replace(CHINESE_NUMBER_SEQUENCE_RE, (segment, offset, sourceText) => {
    const parsed = parseChineseNumberWords(segment);
    if (!parsed) return segment;
    if (segment === parsed) return segment;

    const safeOffset = typeof offset === "number" ? offset : 0;
    const previousChar = safeOffset > 0 ? sourceText[safeOffset - 1] : "";
    const nextChar = sourceText[safeOffset + segment.length] || "";
    const nextTwoChars = sourceText.slice(safeOffset + segment.length, safeOffset + segment.length + 2);
    if ((segment === "百" || segment === "千" || segment === "万" || segment === "萬") && nextTwoChars === "分之") {
      return segment;
    }
    if (shouldSkipShortNumberSegment({ segment, previousChar, nextChar, sourceText, offset: safeOffset })) {
      return segment;
    }

    stats.numberReplacements += 1;
    return parsed;
  });

const restorePlaceholders = (value: string, placeholders: Map<string, string>) => {
  let restored = value;
  for (const [token, original] of placeholders.entries()) {
    restored = restored.replaceAll(token, original);
  }
  return restored;
};

const protectByRegex = ({
  value,
  regex,
  placeholders,
  counter,
}: {
  value: string;
  regex: RegExp;
  placeholders: Map<string, string>;
  counter: () => void;
}) =>
  value.replace(regex, (match) => {
    const token = `__CANON_LITERAL_${placeholders.size}__`;
    placeholders.set(token, match);
    counter();
    return token;
  });

const protectIdioms = (
  value: string,
  placeholders: Map<string, string>,
  stats: DictationCanonicalizerStats
) => {
  let protectedText = value;
  const orderedIdioms = [...IDIOM_PROTECTIONS].sort((a, b) => b.length - a.length);
  for (const idiom of orderedIdioms) {
    const re = new RegExp(escapeRegExp(idiom), "g");
    protectedText = protectedText.replace(re, (match) => {
      const token = `__CANON_IDIOM_${placeholders.size}__`;
      placeholders.set(token, match);
      stats.idiomProtections += 1;
      return token;
    });
  }
  return protectedText;
};

const protectLiteralMentions = (
  value: string,
  placeholders: Map<string, string>,
  stats: DictationCanonicalizerStats
) => {
  const termGroup = LITERAL_TERMS.join("|");
  const literalPatterns = [
    new RegExp(`(?:这个词是|这个字是|这个符号是|念作|读作|写作)\\s*(?:“)?(?:${termGroup})(?:”)?`, "g"),
    new RegExp(`(?:“)?(?:${termGroup})(?:”)?\\s*(?:这个字|这个词|这个符号)`, "g"),
    new RegExp(`["“”'](?:${termGroup})["“”']`, "g"),
  ];

  let protectedText = value;
  for (const pattern of literalPatterns) {
    protectedText = protectByRegex({
      value: protectedText,
      regex: pattern,
      placeholders,
      counter: () => {
        stats.literalProtections += 1;
      },
    });
  }
  return protectedText;
};

const applyLowAmbiguityPunctuationRules = (
  value: string,
  stats: DictationCanonicalizerStats
): string => {
  let next = value.replace(SENTENCE_END_PUNCT_WORD_RE, (match) => {
    const symbol = PUNCTUATION_WORD_TO_SYMBOL[match];
    if (!symbol) return match;
    stats.punctuationReplacements += 1;
    return symbol;
  });

  next = next.replace(SAFE_FORWARD_SLASH_RE, (_match, left, _word, right) => {
    stats.punctuationReplacements += 1;
    return `${left}/${right}`;
  });

  next = next.replace(SAFE_BACK_SLASH_RE, (_match, left, right) => {
    stats.punctuationReplacements += 1;
    return `${left}\\${right}`;
  });

  next = next.replace(DOT_TLD_RE, (_match, tld) => {
    stats.punctuationReplacements += 1;
    return `.${tld.toLowerCase()}`;
  });

  next = next.replace(
    /([零〇一二两三四五六七八九十百千万萬]{1,3})\s*点\s*([零〇一二两三四五六七八九十百千万萬]{1,3})\s*分/g,
    (_match, hourText, minuteText) => {
      stats.numberReplacements += 1;
      return `${toArabicNumeral(hourText)}点${toArabicNumeral(minuteText)}分`;
    }
  );

  return normalizeResidualChineseDecimals(next, stats);
};

const normalizeResidualChineseDecimals = (
  value: string,
  stats: DictationCanonicalizerStats
): string => {
  let next = value;
  let replacedDecimal = true;
  let decimalPass = 0;

  while (replacedDecimal && decimalPass < 4) {
    replacedDecimal = false;
    decimalPass += 1;
    next = next.replace(DECIMAL_SPOKEN_RE, (match, left, right, offset, sourceText) => {
      const safeOffset = typeof offset === "number" ? offset : 0;
      const charAfter = sourceText[safeOffset + match.length] || "";
      if (charAfter && "分时秒钟".includes(charAfter)) {
        return match;
      }
      const leftArabic = /\d/.test(left) ? left : parseChineseNumberWords(left);
      const rightArabic = /\d/.test(right) ? right : parseChineseNumberWords(right);
      if (!leftArabic || !rightArabic) return match;
      replacedDecimal = true;
      stats.punctuationReplacements += 1;
      stats.dotConversions += 1;
      return `${leftArabic}.${rightArabic}`;
    });
  }

  return next;
};

const normalizeKnownAsrBrandConfusions = (value: string): string => {
  let next = value;
  for (const pattern of QWEN_ASR_CONFUSION_PATTERNS) {
    next = next.replace(pattern, "千问ASR");
  }
  return next;
};

const hasAnyHanChars = (value: string) => HAN_CHAR_SINGLE_RE.test(value);

export const canonicalizeDictationText = (
  text: string,
  options: DictationCanonicalizerOptions = {}
): DictationCanonicalizerResult => {
  const source = normalizedSource(options.source);
  const locale = normalizedLocale(options.locale);
  const preferredLanguage = normalizedLanguage(options.preferredLanguage);
  const baseText = typeof text === "string" ? text : "";

  const stats: DictationCanonicalizerStats = {
    enabled: options.canonicalizerEnabled !== false,
    chineseEnabled: false,
    source,
    locale,
    preferredLanguage,
    numberEnabled: options.numberEnabled !== false,
    punctuationEnabled: options.punctuationEnabled !== false,
    numberReplacements: 0,
    punctuationReplacements: 0,
    literalProtections: 0,
    idiomProtections: 0,
    dotConversions: 0,
    dictionaryProtections: 0,
    dictionaryCorrections: 0,
  };

  if (!stats.enabled || !baseText.trim()) {
    return { text: baseText, stats };
  }

  const chineseEnabled = isChineseContextEnabled(baseText, preferredLanguage);
  stats.chineseEnabled = chineseEnabled;
  if (!chineseEnabled || !hasAnyHanChars(baseText)) {
    return { text: baseText, stats };
  }

  const placeholders = new Map<string, string>();
  const dictionaryTerms = getChineseDictionaryTerms(options.customDictionary);
  let next = baseText;
  next = repairCustomDictionaryTerms(next, dictionaryTerms, stats);
  next = protectCustomDictionaryTerms(next, dictionaryTerms, placeholders, stats);
  next = protectIdioms(next, placeholders, stats);
  next = protectLiteralMentions(next, placeholders, stats);

  if (stats.punctuationEnabled) {
    next = applyLowAmbiguityPunctuationRules(next, stats);
  }

  next = normalizeKnownAsrBrandConfusions(next);

  if (stats.numberEnabled) {
    const beforeDate = next;
    next = normalizeChineseDateExpressions(next);
    if (next !== beforeDate) {
      stats.numberReplacements += 1;
    }
    next = normalizeSpokenChineseNumbersWithContext(next, stats);
    next = normalizeResidualChineseDecimals(next, stats);
  }

  next = restorePlaceholders(next, placeholders);

  return {
    text: next,
    stats,
  };
};

export default canonicalizeDictationText;
