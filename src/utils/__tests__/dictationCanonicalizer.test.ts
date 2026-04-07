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
  { name: "时间零五表达不转小数", input: "九点零五", expected: "9点零五" },
  { name: "时间零五句中不转小数", input: "今天三点零五开会", expected: "今天3点零五开会" },
  { name: "时间一刻表达不转小数", input: "十点一刻开会", expected: "10点一刻开会" },
  { name: "时间一刻含十二不转小数", input: "十二点一刻开会", expected: "12点一刻开会" },
  { name: "时间五十表达不转小数", input: "四点五十开会", expected: "4点五十开会" },
  { name: "时间五十句中不转小数", input: "今天四点五十开会", expected: "今天4点五十开会" },
  { name: "时间二十三表达不转小数", input: "四点二十三开会", expected: "4点23开会" },
  { name: "时间二十三句中不转小数", input: "今天四点二十三开会", expected: "今天4点23开会" },
  { name: "时间十一点一表达不转小数", input: "十一点一开会", expected: "11点一开会" },
  { name: "时间十二点一表达不转小数", input: "十二点一开会", expected: "12点一开会" },
  { name: "时间二十一点一表达不转小数", input: "二十一点一开会", expected: "21点一开会" },
  { name: "时间十一点一句中不转小数", input: "今天十一点一开会", expected: "今天11点一开会" },
  { name: "时间前缀二十五表达不转小数", input: "今天四点二十五", expected: "今天4点25" },
  { name: "时间前缀下午二十五表达不转小数", input: "下午四点二十五", expected: "下午4点25" },
  { name: "时间前置词在二十五表达不转小数", input: "在四点二十五提交", expected: "在4点25提交" },
  {
    name: "时间前置词请在二十五表达不转小数",
    input: "请在四点二十五提交",
    expected: "请在4点25提交",
  },
  { name: "时间前置词请于二十五表达不转小数", input: "请于四点二十五提交", expected: "请于4点25提交" },
  { name: "时间助词要在二十五表达不转小数", input: "要在四点二十五提交", expected: "要在4点25提交" },
  { name: "时间助词会在二十五表达不转小数", input: "会在四点二十五提交", expected: "会在4点25提交" },
  { name: "时间助词将在二十五表达不转小数", input: "将在四点二十五提交", expected: "将在4点25提交" },
  {
    name: "时间助词预计于二十五表达不转小数",
    input: "预计于四点二十五提交",
    expected: "预计于4点25提交",
  },
  { name: "时间前置词在单分钟表达不转小数", input: "在十一点二提交", expected: "在11点二提交" },
  {
    name: "时间前置词请在单分钟表达不转小数",
    input: "请在十一点二提交",
    expected: "请在11点二提交",
  },
  { name: "时间助词将在单分钟表达不转小数", input: "将在十一点二提交", expected: "将在11点二提交" },
  { name: "时间前缀今天单分钟提交不转小数", input: "今天十一点二提交", expected: "今天11点二提交" },
  { name: "时间前缀今晚单分钟提交不转小数", input: "今晚十一点二提交", expected: "今晚11点二提交" },
  { name: "无介词预计二十五仍按小数处理", input: "预计四点二十五提交", expected: "预计4.25提交" },
  { name: "无介词预计单分钟仍按小数处理", input: "预计十一点二提交", expected: "预计11.2提交" },
  { name: "无介词将二十五仍按小数处理", input: "将四点二十五作为系数", expected: "将4.25作为系数" },
  { name: "前置词词内包含在仍按小数处理", input: "存在四点二五误差", expected: "存在4.25误差" },
  { name: "版本单分钟提交仍按小数处理", input: "版本十一点二提交", expected: "版本11.2提交" },
  { name: "版本单分钟左右提交仍按小数处理", input: "版本十一点二左右提交", expected: "版本11.2左右提交" },
  { name: "版本单分钟前后提交仍按小数处理", input: "版本十一点二前后提交", expected: "版本11.2前后提交" },
  { name: "版本号单分钟左右提交仍按小数处理", input: "版本号十一点二左右提交", expected: "版本号11.2左右提交" },
  { name: "版本号单分钟前后提交仍按小数处理", input: "版本号十一点二前后提交", expected: "版本号11.2前后提交" },
  { name: "版本二十五左右提交仍按小数处理", input: "版本四点二十五左右提交", expected: "版本4.25左右提交" },
  { name: "时间前缀温度单分钟仍按小数处理", input: "今天十一点二度", expected: "今天11.2度" },
  { name: "时间前缀单分钟左右提交仍按时刻处理", input: "今晚十一点二左右提交", expected: "今晚11点二左右提交" },
  { name: "时间截止表达不转小数", input: "四点五十九截止", expected: "4点59截止" },
  { name: "时间截止句中不转小数", input: "请在四点五十九截止提交", expected: "请在4点59截止提交" },
  { name: "时间左右提交表达不转小数", input: "四点二十五左右提交", expected: "4点25左右提交" },
  { name: "时间左右逗号提交表达不转小数", input: "四点二十五左右，提交", expected: "4点25左右，提交" },
  {
    name: "时间左右预计提交表达不转小数",
    input: "预计四点二十五左右提交",
    expected: "预计4点25左右提交",
  },
  { name: "时间前后逗号开会表达不转小数", input: "四点二十五前后，开会", expected: "4点25前后，开会" },
  { name: "价格左右表达仍按小数处理", input: "价格四点二十五左右", expected: "价格4.25左右" },
  { name: "价格左右逗号表达仍按小数处理", input: "价格四点二十五左右，波动", expected: "价格4.25左右，波动" },
  { name: "无介词将左右表达仍按小数处理", input: "将四点二十五左右作为系数", expected: "将4.25左右作为系数" },
  { name: "点后高单位尾词不转十进制小数", input: "三点二十万", expected: "3点二十万" },
  {
    name: "句中点后高单位尾词不转十进制小数",
    input: "目标是三点二十万用户",
    expected: "目标是3点二十万用户",
  },
  { name: "口语一点保留汉字", input: "干净一点", expected: "干净一点" },
  { name: "口语早一点保持", input: "早一点提交", expected: "早一点提交" },
  { name: "口语晚一点保持", input: "晚一点提醒我", expected: "晚一点提醒我" },
  { name: "口语早一点一点保持", input: "早一点一点出发", expected: "早一点一点出发" },
  { name: "口语晚一点一点保持", input: "晚一点一点提醒我", expected: "晚一点一点提醒我" },
  { name: "时间晚一点半仍按时刻处理", input: "晚一点半开会", expected: "晚1点半开会" },
  { name: "口语重复一点保持", input: "一点一点", expected: "一点一点" },
  { name: "口语一点一滴保持", input: "一点一滴", expected: "一点一滴" },
  { name: "固定表达两点一线保持", input: "两点一线", expected: "两点一线" },
  { name: "句中两点一线保持", input: "生活就是两点一线", expected: "生活就是两点一线" },
  { name: "固定表达三点一线保持", input: "三点一线", expected: "三点一线" },
  { name: "句中三点一线保持", input: "生活就是三点一线", expected: "生活就是三点一线" },
  { name: "句中口语重复一点保持", input: "慢慢来一点一点做", expected: "慢慢来一点一点做" },
  { name: "序数列表第一点一共保持词形", input: "第一点一共三项", expected: "第一点一共3项" },
  { name: "序数列表第三点一共保持词形", input: "第三点一共三项", expected: "第三点一共3项" },
  { name: "口语一下保留汉字", input: "转一下", expected: "转一下" },
  { name: "这一层保留汉字", input: "这一层", expected: "这一层" },
  { name: "第一层保留汉字", input: "第一层", expected: "第一层" },
  { name: "一点一仍按小数处理", input: "一点一", expected: "1.1" },
  { name: "版本两点一仍按小数处理", input: "版本两点一", expected: "版本2.1" },
  { name: "版本三点一仍按小数处理", input: "版本三点一", expected: "版本3.1" },
  { name: "版本十一点一仍按小数处理", input: "版本十一点一", expected: "版本11.1" },
  { name: "版本四点五仍按小数处理", input: "版本四点五", expected: "版本4.5" },
  { name: "版本四点五十九仍按小数处理", input: "版本四点五十九", expected: "版本4.59" },
  { name: "版本四点二十五仍按小数处理", input: "版本四点二十五", expected: "版本4.25" },
  { name: "版本四点二三仍按小数处理", input: "版本四点二三", expected: "版本4.23" },
  { name: "版本三点二五仍按小数处理", input: "版本三点二五", expected: "版本3.25" },
  { name: "三点二五仍按小数处理", input: "三点二五", expected: "3.25" },
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
