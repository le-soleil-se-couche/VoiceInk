import { describe, expect, it } from "vitest";
import { canonicalizeDictationText } from "../dictationCanonicalizer";

type CanonCase = {
  name: string;
  input: string;
  expected: string;
  preferredLanguage?: string;
};

const CASES: CanonCase[] = [
  { name: "句号转符号", input: "会议结束句号", expected: "会议结束。" },
  { name: "逗号转符号", input: "请看这里逗号", expected: "请看这里，" },
  { name: "问号转符号", input: "真的可以吗问号", expected: "真的可以吗？" },
  { name: "感叹号转符号", input: "太好了感叹号", expected: "太好了！" },
  { name: "冒号转符号", input: "注意一下冒号", expected: "注意一下：" },
  { name: "分号转符号", input: "这里停顿分号", expected: "这里停顿；" },
  { name: "顿号转符号", input: "第一步顿号", expected: "第1步、" },
  { name: "斜杠高置信转换", input: "a 斜杠 b", expected: "a/b" },
  { name: "反斜杠高置信转换", input: "C 反斜杠 D", expected: "C\\D" },
  { name: "斜杠高置信转换 - 有空格", input: "a 斜杠 b", expected: "a/b" },
  { name: "反斜杠高置信转换 - 有空格", input: "C 反斜杠 D", expected: "C\\D" },
  { name: "杠高置信转换", input: "a 杠 b", expected: "a/b" },
  { name: "杠高置信转换 - 有空格", input: "a 杠 b", expected: "a/b" },

  { name: "口述域名转换", input: "open 点 com", expected: "open 点 com" },
  { name: "字面提及 - 这个词是", input: "这个词是问号", expected: "这个词是问号" },
  { name: "字面提及-X 这个字", input: "问号这个字", expected: "问号这个字" },
  { name: "字面提及 - 引号词", input: "“句号”", expected: "“句号”" },
  { name: "行内解释不替换", input: "句号是中文标点", expected: "句号是中文标点" },
  {
    name: "连续标点词行内不激进替换",
    input: "问号感叹号然后继续",
    expected: "问号感叹号然后继续",
  },
  { name: "年月日日期归一", input: "二零二六年一月十五日", expected: "2026年1月15日" },
  { name: "月日日期归一", input: "一月十五日", expected: "1月15日" },
  { name: "数量归一", input: "我有三百二十个文件", expected: "我有320个文件" },
  { name: "金额归一", input: "费用是一千二百元", expected: "费用是1200元" },
  { name: "序号归一", input: "这是第十二次", expected: "这是第12次" },
  { name: "章节归一", input: "第三章", expected: "第3章" },
  { name: "短数字量词归一", input: "我有十个任务", expected: "我有十个任务" },
  { name: "口语小数字默认保留", input: "今天来了两个人", expected: "今天来了两个人" },
  { name: "品牌词千问 ASR 保持原文", input: "千问 ASR", expected: "千问 ASR" },
  { name: "短数字连英文保持原文", input: "千万 ASR", expected: "千万 ASR" },
  { name: "千问 ASR 误识别 - 长数字", input: "10000000 个 a s r", expected: "千问ASR" },
  { name: "千问 ASR 误识别 - 千字变数字", input: "1000问 ASR", expected: "千问ASR" },
  { name: "长串数字归一", input: "一二三四", expected: "1234" },
  { name: "短串数字默认保留", input: "一二", expected: "一二" },
  { name: "短串数字带通用量词默认保留", input: "一二个", expected: "一二个" },
  { name: "短串数字无量词保留", input: "来 一二 跳", expected: "来 一二 跳" },
  { name: "短串数字有单位归一", input: "二零年", expected: "二零年" },
  { name: "百分号归一", input: "三十%", expected: "三十%" },
  { name: "百分之表达归一", input: "百分之三十", expected: "百分之30" },
  { name: "句尾编号归一", input: "编号是二零四六号", expected: "编号是2046号" },
  { name: "年份归一", input: "今年二零二六", expected: "今年2026" },
  { name: "两位年份默认保留", input: "二零", expected: "二零" },
  { name: "小数点归一", input: "三点五", expected: "3.5" },
  { name: "多位小数点归一", input: "一二点三四", expected: "12.34" },
  { name: "版本号归一", input: "版本二点零点一", expected: "版本2.0.1" },
  {
    name: "IP 归一",
    input: "IP 一九二点一六八点零点一",
    expected: "IP 192.168.0.1",
  },
  { name: "成语保护 - 一心一意", input: "一心一意", expected: "一心一意" },
  { name: "成语保护 - 三心二意", input: "三心二意", expected: "三心二意" },
  { name: "成语保护 - 七上八下", input: "七上八下", expected: "七上八下" },
  { name: "成语保护 - 十全十美", input: "十全十美", expected: "十全十美" },
  { name: "点域名混合归一", input: "七点 com", expected: "七点 com" },
  { name: "中英混输归一", input: "这个 API 返回了三百个 error", expected: "这个 API 返回了三百个 error" },
  // Mixed Chinese + English preservation tests
  { name: "混输 - 产品名", input: "用 VSCode 打开文件", expected: "用 VSCode 打开文件" },
  { name: "混输 - GitHub", input: "推送到 GitHub 仓库", expected: "推送到 GitHub 仓库" },
  { name: "混输 - React 组件", input: "导入 React 组件", expected: "导入 React 组件" },
  { name: "混输 - TypeScript", input: "检查 TypeScript 类型", expected: "检查 TypeScript 类型" },
  { name: "混输 - Docker", input: "运行 Docker 容器", expected: "运行 Docker 容器" },
  { name: "混输 - SDK", input: "安装 SDK 包", expected: "安装 SDK 包" },
  { name: "混输 - IDE", input: "配置 IDE 设置", expected: "配置 IDE 设置" },
  { name: "念作字面保护", input: "念作句号", expected: "念作句号" },
  { name: "读作字面保护", input: "读作斜杠", expected: "读作斜杠" },
  { name: "写作字面保护", input: "写作问号", expected: "写作问号" },
  { name: "引号词字面保护", input: "“问号”这个词", expected: "“问号”这个词" },
  { name: "这个字是字面保护", input: "这个字是点", expected: "这个字是点" },
  { name: "这个符号是字面保护", input: "这个符号是斜杠", expected: "这个符号是斜杠" },
  { name: "行内逗号提示不替换", input: "这里加个逗号然后继续", expected: "这里加个逗号然后继续" },
  { name: "换行结尾标点转换", input: "换行后问号\n", expected: "换行后？\n" },
  { name: "行内顿号提示不替换", input: "列表第一项顿号第二项", expected: "列表第1项顿号第2项" },
  {
    name: "空白文本保持",
    input: "   ",
    expected: "   ",
    preferredLanguage: "zh-CN",
  },
  {
    name: "en 语言不启用中文规则",
    input: "hello world 句号",
    expected: "hello world 句号",
    preferredLanguage: "en",
  },
  {
    name: "auto + 低中文占比不启用",
    input: "hello 中 world",
    expected: "hello 中 world",
    preferredLanguage: "auto",
  },
  {
    name: "auto + 高中文占比启用",
    input: "我有三十个任务",
    expected: "我有三十个任务",
    preferredLanguage: "auto",
  },
  {
    name: "zh 模式但无中文字符保持",
    input: "open dot com",
    expected: "open dot com",
    preferredLanguage: "zh-CN",
  },
  // Over-optimization prevention: colloquial expressions with common classifiers
  { name: "口语 - 三本书", input: "我买了三本书", expected: "我买了三本书" },
  { name: "口语 - 八天", input: "等了八天", expected: "等了八天" },
  { name: "口语 - 七层", input: "这楼有七层", expected: "这楼有七层" },
  { name: "口语 - 九本书", input: "买了九本书", expected: "买了九本书" },
  { name: "口语 - 十个人", input: "来了十个人", expected: "来了十个人" },
  { name: "口语 - 三杯咖啡", input: "点了三杯咖啡", expected: "点了三杯咖啡" },
  { name: "口语 - 五张纸", input: "给我五张纸", expected: "给我五张纸" },
  { name: "口语 - 十句话", input: "说了十句话", expected: "说了十句话" },
  { name: "口语 - 两棵树", input: "种了两棵树", expected: "种了两棵树" },
  { name: "口语 - 五只猫", input: "养了五只猫", expected: "养了五只猫" },
  { name: "口语 - 六个人", input: "来了六个人", expected: "来了六个人" },
];

describe("canonicalizeDictationText", () => {
  it("covers the fixed Chinese canonicalization corpus", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(50);
    for (const item of CASES) {
      const result = canonicalizeDictationText(item.input, {
        preferredLanguage: item.preferredLanguage ?? "zh-CN",
        locale: "zh-CN",
        source: "unit-test",
      });
      expect(result.text, item.name).toBe(item.expected);
    }
  });

  it("supports disabling the canonicalizer globally", () => {
    const result = canonicalizeDictationText("会议结束句号", {
      preferredLanguage: "zh-CN",
      canonicalizerEnabled: false,
    });
    expect(result.text).toBe("会议结束句号");
    expect(result.stats.enabled).toBe(false);
  });

  it("supports toggling number and punctuation paths separately", () => {
    const punctuationOnly = canonicalizeDictationText("我有三十个任务句号", {
      preferredLanguage: "zh-CN",
      numberEnabled: false,
      punctuationEnabled: true,
    });
    expect(punctuationOnly.text).toBe("我有三十个任务。");

    const numberOnly = canonicalizeDictationText("我有三十个任务句号", {
      preferredLanguage: "zh-CN",
      numberEnabled: true,
      punctuationEnabled: false,
    });
    expect(numberOnly.text).toBe("我有三十个任务句号");
  });

  it("is idempotent for already-normalized strings", () => {
    const input = "2026年1月15日，版本2.0.1，IP 192.168.0.1";
    const once = canonicalizeDictationText(input, { preferredLanguage: "zh-CN" }).text;
    const twice = canonicalizeDictationText(once, { preferredLanguage: "zh-CN" }).text;
    expect(once).toBe(input);
    expect(twice).toBe(input);
  });

  it("prevents over-optimization for colloquial number expressions", () => {
    const colloquialCases = [
      "我买了三本书",
      "等了八天",
      "这楼有七层",
      "买了九本书",
      "来了十个人",
      "点了三杯咖啡",
      "给我五张纸",
      "说了十句话",
    ];
    for (const input of colloquialCases) {
      const result = canonicalizeDictationText(input, {
        preferredLanguage: "zh-CN",
        locale: "zh-CN",
        source: "unit-test",
      });
      expect(result.text, `Should not convert colloquial: ${input}`).toBe(input);
    }
  });
});
