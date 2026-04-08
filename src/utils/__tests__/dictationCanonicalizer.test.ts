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
  { name: "顿号转符号", input: "第一步顿号", expected: "第一步、" },
  { name: "斜杠高置信转换", input: "a斜杠b", expected: "a/b" },
  { name: "反斜杠高置信转换", input: "C反斜杠D", expected: "C\\D" },
  { name: "口述域名转换", input: "open点com", expected: "open.com" },
  { name: "字面提及-这个词是", input: "这个词是问号", expected: "这个词是问号" },
  { name: "字面提及-X这个字", input: "问号这个字", expected: "问号这个字" },
  { name: "字面提及-引号词", input: "“句号”", expected: "“句号”" },
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
  { name: "序号归一", input: "这是第十二次", expected: "这是第十二次" },
  { name: "章节归一", input: "第三章", expected: "第三章" },
  { name: "短数字量词归一", input: "我有十个任务", expected: "我有10个任务" },
  { name: "口语小数字默认保留", input: "今天来了两个人", expected: "今天来了两个人" },
  { name: "品牌词千问ASR保持原文", input: "千问ASR", expected: "千问ASR" },
  { name: "短数字连英文保持原文", input: "千万ASR", expected: "千万ASR" },
  { name: "千问ASR误识别-长数字", input: "10000000个a s r", expected: "千问ASR" },
  { name: "千问ASR误识别-千字变数字", input: "1000问ASR", expected: "千问ASR" },
  { name: "长串数字归一", input: "一二三四", expected: "1234" },
  { name: "短串数字默认保留", input: "一二", expected: "一二" },
  { name: "短串数字带通用量词默认保留", input: "一二个", expected: "一二个" },
  { name: "短串数字无量词保留", input: "来 一二 跳", expected: "来 一二 跳" },
  { name: "短串数字有单位归一", input: "二零年", expected: "20年" },
  { name: "百分号归一", input: "三十%", expected: "30%" },
  { name: "百分之表达归一", input: "百分之三十", expected: "百分之30" },
  { name: "句尾编号归一", input: "编号是二零四六号", expected: "编号是2046号" },
  { name: "年份归一", input: "今年二零二六", expected: "今年2026" },
  { name: "两位年份默认保留", input: "二零", expected: "二零" },
  { name: "小数点归一", input: "三点五", expected: "3.5" },
  { name: "多位小数点归一", input: "一二点三四", expected: "12.34" },
  { name: "时间表达优先归一", input: "十二点二十七分", expected: "12点27分" },
  { name: "口语一点保留汉字", input: "干净一点", expected: "干净一点" },
  { name: "口语一点一点保留汉字", input: "一点一点", expected: "一点一点" },
  { name: "口语一点一滴保留汉字", input: "一点一滴", expected: "一点一滴" },
  {
    name: "终句语气词-一点都没有耶保留汉字",
    input: "今晨一点消息都没有耶",
    expected: "今晨一点消息都没有耶",
  },
  {
    name: "终句语气词-一点都没有哩保留汉字",
    input: "今晨一点消息都没有哩",
    expected: "今晨一点消息都没有哩",
  },
  {
    name: "终句语气词-一点都没有咯保留汉字",
    input: "今晨一点消息都没有咯",
    expected: "今晨一点消息都没有咯",
  },
  {
    name: "句中口语一点一点保留汉字",
    input: "慢慢来一点一点改",
    expected: "慢慢来一点一点改",
  },
  {
    name: "句中口语一点一滴保留汉字",
    input: "我们一点一滴积累经验",
    expected: "我们一点一滴积累经验",
  },
  {
    name: "非终句语气词时间表达继续归一",
    input: "凌晨一点消息都没有耶要继续等",
    expected: "凌晨1点消息都没有耶要继续等",
  },
  { name: "一点一点外的真实小数继续归一", input: "一点一", expected: "1.1" },
  { name: "口语一下保留汉字", input: "转一下", expected: "转一下" },
  { name: "这一层保留汉字", input: "这一层", expected: "这一层" },
  { name: "第一层保留汉字", input: "第一层", expected: "第一层" },
  { name: "三点一四作为小数", input: "三点一四", expected: "3.14" },
  { name: "保存三天转阿拉伯数字", input: "保存三天", expected: "保存3天" },
  { name: "已是阿拉伯长数字保持", input: "20260328", expected: "20260328" },
  { name: "已是阿拉伯金额保持", input: "300元", expected: "300元" },
  { name: "版本号归一", input: "版本二点零点一", expected: "版本2.0.1" },
  {
    name: "IP 归一",
    input: "IP 一九二点一六八点零点一",
    expected: "IP 192.168.0.1",
  },
  { name: "成语保护-一心一意", input: "一心一意", expected: "一心一意" },
  { name: "成语保护-三心二意", input: "三心二意", expected: "三心二意" },
  { name: "成语保护-七上八下", input: "七上八下", expected: "七上八下" },
  { name: "成语保护-十全十美", input: "十全十美", expected: "十全十美" },
  {
    name: "中英混输归一",
    input: "这个 API 返回了三百个 error",
    expected: "这个 API 返回了300个 error",
  },
  { name: "点域名混合归一", input: "七点com", expected: "7.com" },
  { name: "念作字面保护", input: "念作句号", expected: "念作句号" },
  { name: "读作字面保护", input: "读作斜杠", expected: "读作斜杠" },
  { name: "写作字面保护", input: "写作问号", expected: "写作问号" },
  { name: "引号词字面保护", input: "“问号”这个词", expected: "“问号”这个词" },
  { name: "这个字是字面保护", input: "这个字是点", expected: "这个字是点" },
  { name: "这个符号是字面保护", input: "这个符号是斜杠", expected: "这个符号是斜杠" },
  { name: "行内逗号提示不替换", input: "这里加个逗号然后继续", expected: "这里加个逗号然后继续" },
  { name: "换行结尾标点转换", input: "换行后问号\n", expected: "换行后？\n" },
  { name: "行内顿号提示不替换", input: "列表第一项顿号第二项", expected: "列表第一项顿号第二项" },
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
    expected: "我有30个任务",
    preferredLanguage: "auto",
  },
  {
    name: "zh 模式但无中文字符保持",
    input: "open dot com",
    expected: "open dot com",
    preferredLanguage: "zh-CN",
  },
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
    expect(numberOnly.text).toBe("我有30个任务句号");
  });

  it("is idempotent for already-normalized strings", () => {
    const input = "2026年1月15日，版本 2.0.1，IP 192.168.0.1";
    const once = canonicalizeDictationText(input, { preferredLanguage: "zh-CN" }).text;
    const twice = canonicalizeDictationText(once, { preferredLanguage: "zh-CN" }).text;
    expect(once).toBe(input);
    expect(twice).toBe(input);
  });
});
