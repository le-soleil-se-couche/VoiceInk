// Test the shouldSkipShortNumberSegment logic

const CHINESE_NUMBER_UNIT_CHAR_RE = /[十百千万萬]/;
const CHINESE_QUANTIFIER_SUFFIX_RE = /(?:个 | 位|名 | 条|项|份|台|次|句|行|段|年|月|周|天|日|号|点|分|秒|时|钟|元|块|币|￥|¥|度|℃|公里|里|米|厘米|毫米|千克|公斤|克|%|％|版|章|节|页|级|本|件|篇|集|层|届|期|套|辆)/;
const LATIN_CHAR_RE = /[A-Za-z]/;

const shouldSkipShortNumberSegment = ({
  segment,
  previousChar,
  nextChar,
  sourceText,
  offset,
}) => {
  if (segment.length > 2) return false;
  if (previousChar === "第") return false;
  if (nextChar === ".") return false;
  if (nextChar === "/") return false;
  if (nextChar === "个" && !CHINESE_NUMBER_UNIT_CHAR_RE.test(segment)) return true;
  if (LATIN_CHAR_RE.test(previousChar) || LATIN_CHAR_RE.test(nextChar)) return true;
  if (sourceText.slice(Math.max(0, offset - 3), offset).endsWith("分之")) return false;
  return !CHINESE_QUANTIFIER_SUFFIX_RE.test(nextChar || "");
};

const tests = [
  { segment: "三", previousChar: "了", nextChar: "本", sourceText: "我买了三本书", offset: 3 },
  { segment: "八", previousChar: "了", nextChar: "天", sourceText: "等了八天", offset: 3 },
  { segment: "七", previousChar: "有", nextChar: "层", sourceText: "这楼有七层", offset: 5 },
  { segment: "十", previousChar: "了", nextChar: "个", sourceText: "来了十个人", offset: 3 },
  { segment: "两", previousChar: "了", nextChar: "个", sourceText: "今天来了两个人", offset: 5 },
  { segment: "五", previousChar: "们", nextChar: "个", sourceText: "我们五个人去", offset: 3 },
];

for (const t of tests) {
  const skip = shouldSkipShortNumberSegment(t);
  console.log(`"${t.segment}" + "${t.nextChar}": skip=${skip}, hasUnit=${CHINESE_NUMBER_UNIT_CHAR_RE.test(t.segment)}`);
}
