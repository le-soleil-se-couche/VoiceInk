import { canonicalizeDictationText } from './src/utils/dictationCanonicalizer.ts';

const result = canonicalizeDictationText("a 斜杠 b", {
  preferredLanguage: "zh-CN",
  locale: "zh-CN",
  source: "test",
});
console.log("Result:", result.text);
console.log("Stats:", result.stats);
