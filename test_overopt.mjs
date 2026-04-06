import { canonicalizeDictationText } from './src/utils/dictationCanonicalizer.ts';

const testCases = [
  { name: "自然口语 - 两个人", input: "今天来了两个人", expected: "今天来了两个人" },
  { name: "自然口语 - 三本书", input: "我买了三本书", expected: "我买了三本书" },
  { name: "自然口语 - 五个人", input: "我们五个人去", expected: "我们五个人去" },
  { name: "自然口语 - 八天", input: "等了八天", expected: "等了八天" },
  { name: "固定表达 - 一边", input: "一边吃饭一边走", expected: "一边吃饭一边走" },
  { name: "固定表达 - 一样", input: "和你一样", expected: "和你一样" },
  { name: "模糊数量 - 一些", input: "给我一些", expected: "给我一些" },
  { name: "模糊数量 - 几个", input: "还有几个", expected: "还有几个" },
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
