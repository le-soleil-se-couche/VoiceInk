import { canonicalizeDictationText } from './src/utils/dictationCanonicalizer.ts';

// Test with no spaces in input
const result = canonicalizeDictationText("a 斜杠 b", {
  preferredLanguage: "zh-CN",
  locale: "zh-CN",
  source: "test",
});
console.log("Input: 'a 斜杠 b'");
console.log("Result:", result.text);
console.log("Stats:", result.stats);
