import { canonicalizeDictationText } from './src/utils/dictationCanonicalizer.ts';

const testCases = [
  { name: "斜杠无空格", input: "a 斜杠 b", expected: "a/b" },
  { name: "斜杠有空格", input: "a 斜杠 b", expected: "a/b" },
  { name: "反斜杠无空格", input: "C 反斜杠 D", expected: "C\\D" },
  { name: "反斜杠有空格", input: "C 反斜杠 D", expected: "C\\D" },
  { name: "杠无空格", input: "a 杠 b", expected: "a/b" },
  { name: "杠有空格", input: "a 杠 b", expected: "a/b" },
];

let passCount = 0;
let failCount = 0;

for (const t of testCases) {
  const result = canonicalizeDictationText(t.input, {
    preferredLanguage: "zh-CN",
    locale: "zh-CN",
    source: "test",
  });
  const pass = result.text === t.expected;
  if (pass) {
    passCount++;
    console.log(`✓ ${t.name}: "${t.input}" => "${result.text}"`);
  } else {
    failCount++;
    console.log(`✗ ${t.name}: "${t.input}" => "${result.text}" (expected: "${t.expected}")`);
  }
}

console.log(`\nResults: ${passCount} passed, ${failCount} failed`);
