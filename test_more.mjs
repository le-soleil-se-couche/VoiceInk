import { canonicalizeDictationText } from './src/utils/dictationCanonicalizer.ts';

const testCases = [
  { name: "三本书", input: "我买了三本书", expected: "我买了三本书" },
  { name: "八天", input: "等了八天", expected: "等了八天" },
  { name: "七层", input: "这楼有七层", expected: "这楼有七层" },
  { name: "六个人", input: "来了六个人", expected: "来了六个人" },
  { name: "九本书", input: "买了九本书", expected: "买了九本书" },
  { name: "十个人", input: "来了十个人", expected: "来了十个人" },
  { name: "两个人", input: "今天来了两个人", expected: "今天来了两个人" },
  { name: "五个人", input: "我们五个人去", expected: "我们五个人去" },
];

for (const t of testCases) {
  const result = canonicalizeDictationText(t.input, {
    preferredLanguage: "zh-CN",
    locale: "zh-CN",
    source: "test",
  });
  const pass = result.text === t.expected;
  console.log(`${pass ? "✓" : "✗"} ${t.name}: "${t.input}" => "${result.text}" (expected: "${t.expected}")`);
}
