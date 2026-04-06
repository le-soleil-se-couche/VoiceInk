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
  { name: "三杯咖啡", input: "点了三杯咖啡", expected: "点了三杯咖啡" },
  { name: "五张纸", input: "给我五张纸", expected: "给我五张纸" },
  { name: "十句话", input: "说了十句话", expected: "说了十句话" },
  // These should still convert
  { name: "320 个文件", input: "我有三百二十个文件", expected: "我有 320 个文件" },
  { name: "1200 元", input: "费用是一千二百元", expected: "费用是 1200 元" },
  { name: "第 12 次", input: "这是第十二次", expected: "这是第 12 次" },
  { name: "2026 年", input: "二零二六年一月十五日", expected: "2026 年 1 月 15 日" },
  { name: "1234", input: "一二三四", expected: "1234" },
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
