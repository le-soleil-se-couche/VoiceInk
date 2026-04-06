import { canonicalizeDictationText } from './src/utils/dictationCanonicalizer.ts';

// Test what's happening
const result = canonicalizeDictationText("我买了三本书", {
  preferredLanguage: "zh-CN",
  locale: "zh-CN",
  source: "test",
});
console.log("Result:", result.text);
console.log("Stats:", result.stats);

// Test the regex
const CHINESE_QUANTIFIER_SUFFIX_RE = /(?:个 | 位|名 | 条|项|份|台|次|句|行|段|年|月|周|天|日|号|点|分|秒|时|钟|元|块|币|￥|¥|度|℃|公里|里|米|厘米|毫米|千克|公斤|克|%|％|版|章|节|页|级|本|件|篇|集|层|届|期|套|辆)/;
console.log("Does '本' match?", CHINESE_QUANTIFIER_SUFFIX_RE.test("本"));
console.log("Does '天' match?", CHINESE_QUANTIFIER_SUFFIX_RE.test("天"));
console.log("Does '层' match?", CHINESE_QUANTIFIER_SUFFIX_RE.test("层"));
