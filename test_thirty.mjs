import { canonicalizeDictationText } from './src/utils/dictationCanonicalizer.ts';

const result = canonicalizeDictationText("我有三十个任务", {
  preferredLanguage: "auto",
  locale: "zh-CN",
  source: "test",
});
console.log("Result:", result.text);
console.log("Stats:", result.stats);
