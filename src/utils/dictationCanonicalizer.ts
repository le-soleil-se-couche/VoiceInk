export interface DictationCanonicalizerOptions {
  locale?: string | null;
  preferredLanguage?: string | null;
  source?: string | null;
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
const CHINESE_NUMBER_CONTEXT_CHAR_RE = /[零〇一二两三四五六七八九十百千万萬\d]/;
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
  "一点一滴",
  "一时半点",
  "一分半点",
  "一点半点",
  "一点半点儿",
  "两点一线",
  "三点一线",
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
const EXPLICIT_CLOCK_TAIL_RE = /^(?:半|一刻|三刻|[零〇一二两三四五六七八九十百千万萬\d])/;
const TIME_CONTEXT_PREV_RE = /[上下早晚晨午夜今明昨零〇一二两三四五六七八九十百千万萬\d]/;
const LEXICAL_YIDIAN_PROBLEM_NEGATIVE_RE =
  /^(?:问题|問題)\s*(?:都|也)\s*(?:(?:并|並)\s*)?(?:不|没|沒|無|无|未)/;
const LEXICAL_ERHUA_YIDIAN_PROBLEM_NEGATIVE_RE =
  /^[儿兒]\s*(?:问题|問題)\s*(?:都|也)\s*(?:(?:并|並)\s*)?(?:不|没|沒|無|无|未)/;
const MINUTE_LIKE_TIME_FOLLOWUP_RE =
  /^(?:开会|开始|结束|出发|见面|集合|提醒|闹钟|上课|下课|下班|上线|起床|睡觉|发车|起飞|到达|截止|截至)/;
const MINUTE_LIKE_TIME_APPROX_FOLLOWUP_RE =
  /^(?:左右|前后)\s*[，,、]?\s*(?:开会|开始|结束|出发|见面|集合|提醒|闹钟|上课|下课|下班|上线|起床|睡觉|发车|起飞|到达|截止|截至|提交)/;
const MINUTE_LIKE_TIME_SUBMIT_FOLLOWUP_RE = /^(?:[，,、]\s*)?提交/;
const MINUTE_LIKE_NON_TIME_VERSION_PREFIX_RE = /(?:版本(?:号)?)$/;
const MINUTE_LIKE_TIME_PREFIX_RE =
  /(?:今天|明天|后天|昨天|今晚|今早|今晨|今夜|上午|下午|晚上|凌晨|中午|早上|傍晚)$/;
const MINUTE_LIKE_TIME_PREPOSITION_PREFIX_RE =
  /(?:^|[，。！？；、\s])(?:(?:请)?在|(?:请)?于|(?:要|得|会|应|能|可|只|都|就|如果|安排|定|约|计划|预计|将)在|(?:将|会|定|约|预计)于)$/;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizedLanguage = (language?: string | null) =>
  typeof language === "string" && language.trim() ? language.trim() : DEFAULT_LANGUAGE;

const normalizedLocale = (locale?: string | null) =>
  typeof locale === "string" && locale.trim() ? locale.trim() : DEFAULT_LOCALE;

const normalizedSource = (source?: string | null) =>
  typeof source === "string" && source.trim() ? source.trim() : DEFAULT_SOURCE;

const countHanChars = (value: string): number => (value.match(HAN_CHAR_RE) || []).length;

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
  // Preserve repeated phrasing like "...一点一点..." / "...一点儿一点..." when
  // evaluating the minute-like tail segment (for example "...一点十五分"), so
  // repetition does not collapse into mixed numeric clock text.
  if (
    previousChar === "点" &&
    /(?:一点|一点[儿兒])一点$/.test(sourceText.slice(Math.max(0, offset - 6), offset))
  ) {
    return true;
  }
  if (previousChar === "第") return true;
  if (segment === "一" && ORAL_ONE_NEXT_RE.test(nextChar || "")) return true;
  if (segment === "一" && ORAL_ONE_PREV_RE.test(previousChar || "")) return true;
  if (segment === "一" && nextChar === "点") {
    // Preserve the second repeated segment in "...一点一点..." / "...一点儿一点..."
    // so repeated spoken phrasing does not split into mixed numeric hybrids.
    const repeatedPrefix = sourceText.slice(Math.max(0, offset - 3), offset);
    if (/(?:一点|一点[儿兒])$/.test(repeatedPrefix)) return true;

    const tail = sourceText.slice(offset + segment.length + 1).trim();
    const lexicalTail = tail.replace(/^[\s，,、；;:：]+/, "");
    const erhuaLexicalTail = lexicalTail.replace(/^([儿兒])\s*[，,、；;:：]\s*/, "$1");
    // Preserve lexical "一点点" ("a little bit") in all contexts so it does not
    // drift into unnatural clock-like hybrids such as "1点点".
    if (lexicalTail.startsWith("点")) return true;
    // Preserve lexical degree phrase "一点都..." ("not at all") even when preceded
    // by temporal context characters like "凌/晨/夜"; this is not a clock expression.
    if (lexicalTail.startsWith("都")) return true;
    // Preserve lexical degree phrase "一点不/没/沒/无/未..." ("not at all"), including
    // adverb-prefixed forms like "一点并不/并没/并未...", which can
    // otherwise be misread as clock time in temporal-prefix contexts.
    // Keep "一点不要..." eligible for time normalization because it is often
    // imperative scheduling phrasing ("at one o'clock, don't ...").
    if (/^(?:(?:并|並)\s*)?(?:不(?!要)|没|沒|無|无|未)/.test(lexicalTail)) return true;
    // Preserve lexical degree phrase "一点也不/没/沒/无..." ("not at all"), including
    // adverb-prefixed forms like "一点也并不/也并没/也并未...", which can
    // otherwise be misread as a clock expression in temporal-prefix contexts.
    if (/^也\s*(?:(?:并|並)\s*)?(?:不|没|沒|無|无|未)/.test(lexicalTail)) return true;
    // Preserve lexical object phrase "一点问题都/也不(没)..." ("not any problem at all")
    // so temporal-prefix context does not force clock-like rewrites.
    if (LEXICAL_YIDIAN_PROBLEM_NEGATIVE_RE.test(lexicalTail)) return true;
    // Preserve lexical degree phrasing with erhua ("一点儿都/也..." / "一点兒都/也..."), which can
    // otherwise be misread as a clock expression in temporal-prefix contexts.
    if (/^[儿兒]\s*(?:都|也)/.test(erhuaLexicalTail)) return true;
    // Preserve erhua lexical object phrase "一点儿问题都/也不(没)..."
    // under temporal prefixes for the same reason.
    if (LEXICAL_ERHUA_YIDIAN_PROBLEM_NEGATIVE_RE.test(erhuaLexicalTail)) return true;
    // Preserve lexical degree phrasing like "一点儿不/没/沒/无..." ("not at all"), including
    // adverb-prefixed forms like "一点儿并不/并没/并未...", which can
    // otherwise be misread as clock time in temporal-prefix contexts.
    if (/^[儿兒]\s*(?:(?:并|並)\s*)?(?:不|没|沒|無|无|未)/.test(erhuaLexicalTail)) return true;
    // Preserve repeated colloquial erhua phrasing like "一点儿一点...".
    // Even when a clock-like tail follows, converting the repeated segments independently
    // can produce unnatural hybrids such as "1点儿1点一刻".
    if (/^[儿兒]\s*一点/.test(erhuaLexicalTail)) {
      return true;
    }
    // Preserve repeated colloquial phrasing like "一点一点...".
    // This avoids over-normalizing acceptable spoken repetition into "1点1点..." hybrids.
    if (lexicalTail.startsWith("一点")) {
      return true;
    }
    // Preserve colloquial "早一点/晚一点" phrasing unless the tail clearly encodes a clock time.
    if (previousChar === "早" || previousChar === "晚") {
      if (!EXPLICIT_CLOCK_TAIL_RE.test(tail)) {
        return true;
      }
    }
    if (tail.startsWith("一点") && !TIME_CONTEXT_PREV_RE.test(previousChar || "")) return true;
    if (TIME_CONTEXT_PREV_RE.test(previousChar || "")) return false;
    if (/^[零〇一二两三四五六七八九十百千万萬\d]+(?:分|时|秒|鐘|钟)/.test(tail)) return false;
    if (CHINESE_SPOKEN_NUMBER_RE.test(tail)) return false;
    return true;
  }
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
    // Preserve lexical `点 + ...万/千/百` tails (for example "三点二十万") so they are not
    // eagerly collapsed into large Arabic integers and then reinterpreted as decimals.
    if (previousChar === "点" && /[百千万萬]/.test(segment)) {
      return segment;
    }
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
    (match, hourText, minuteText, offset, sourceText) => {
      const safeOffset = typeof offset === "number" ? offset : 0;
      const leadingText = sourceText.slice(0, safeOffset).trimEnd();
      if (/(?:一点|一点[儿兒])$/.test(leadingText)) {
        return match;
      }
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
      const charBefore = safeOffset > 0 ? sourceText[safeOffset - 1] : "";
      const charAfter = sourceText[safeOffset + match.length] || "";
      // Avoid partial matches inside a larger spoken-number fragment (for example
      // "十一点一" matching only "一点一"), which can cause malformed hybrids like "十1.1".
      if (CHINESE_NUMBER_CONTEXT_CHAR_RE.test(charBefore)) {
        return match;
      }
      if (charBefore === "第") {
        return match;
      }
      if (charAfter && "分时秒钟".includes(charAfter)) {
        return match;
      }
      // Preserve leading-zero spoken tails like "点零五" instead of collapsing to ".5".
      // These are often lexical time phrasing and decimalizing them drifts from dictation.
      if ((right.startsWith("零") || right.startsWith("〇") || right.startsWith("0")) && right.length > 1) {
        return match;
      }
      // Avoid malformed hybrids like "4.5十": this usually indicates spoken-number continuation
      // (for example "四点五十"), not a true decimal.
      if (charAfter && "十百千".includes(charAfter)) {
        return match;
      }
      // Preserve quarter-hour phrasing like "十点一刻" / "十点三刻"; this is time, not a decimal.
      if (charAfter === "刻" && (right === "一" || right === "1" || right === "三" || right === "3")) {
        return match;
      }
      // Preserve colloquial repetition like "一点一点" ("bit by bit"), not decimal chains.
      if (charAfter === "点" && (right === "一" || right === "1")) {
        return match;
      }
      const rightArabicForContext = /^\d+$/.test(right) ? right : parseChineseNumberWords(right);
      const minuteLikeValue =
        rightArabicForContext && /^\d+$/.test(rightArabicForContext)
          ? Number(rightArabicForContext)
          : Number.NaN;
      const leftArabicForContext = /^\d+$/.test(left) ? left : parseChineseNumberWords(left);
      const hourLikeValue =
        leftArabicForContext && /^\d+$/.test(leftArabicForContext)
          ? Number(leftArabicForContext)
          : Number.NaN;
      const leadingText = sourceText.slice(0, safeOffset).trimEnd();
      const trailingText = sourceText.slice(safeOffset + match.length).trimStart();
      const hasTimePrefix = MINUTE_LIKE_TIME_PREFIX_RE.test(leadingText);
      const hasPrepositionPrefix = MINUTE_LIKE_TIME_PREPOSITION_PREFIX_RE.test(leadingText);
      const hasSubmitFollowup = MINUTE_LIKE_TIME_SUBMIT_FOLLOWUP_RE.test(trailingText);
      const hasVersionPrefix = MINUTE_LIKE_NON_TIME_VERSION_PREFIX_RE.test(leadingText);
      const hasScheduleFollowup = MINUTE_LIKE_TIME_FOLLOWUP_RE.test(trailingText);
      const hasApproxScheduleFollowup = MINUTE_LIKE_TIME_APPROX_FOLLOWUP_RE.test(trailingText);
      // Preserve explicit time-prefix phrasing like "今天四点二十五" as clock time, not decimals.
      if (
        Number.isFinite(minuteLikeValue) &&
        ((minuteLikeValue >= 10 && minuteLikeValue <= 59 && (hasTimePrefix || hasPrepositionPrefix)) ||
          (minuteLikeValue >= 0 &&
            minuteLikeValue <= 9 &&
            (hasPrepositionPrefix || (hasTimePrefix && hasSubmitFollowup)) &&
            Number.isFinite(hourLikeValue) &&
            hourLikeValue >= 0 &&
            hourLikeValue <= 23))
      ) {
        return match;
      }
      // Preserve schedule-style phrasing like "四点二十三开会" as clock time, not decimals.
      if (
        Number.isFinite(hourLikeValue) &&
        hourLikeValue >= 0 &&
        hourLikeValue <= 23 &&
        Number.isFinite(minuteLikeValue) &&
        minuteLikeValue >= 0 &&
        minuteLikeValue <= 59 &&
        (hasScheduleFollowup || (hasApproxScheduleFollowup && !hasVersionPrefix))
      ) {
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
  let next = baseText;
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
