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
  { name: "序号归一", input: "这是第十二次", expected: "这是第12次" },
  { name: "章节归一", input: "第三章", expected: "第3章" },
  { name: "短数字量词归一", input: "我有十个任务", expected: "我有十个任务" },
  { name: "口语小数字默认保留", input: "今天来了两个人", expected: "今天来了两个人" },
  { name: "口语数量 - 几个人", input: "来了三个人", expected: "来了三个人" },
  { name: "口语数量 - 几本书", input: "读了两本书", expected: "读了两本书" },
  { name: "口语数量 - 几杯水", input: "喝了三杯水", expected: "喝了三杯水" },
  { name: "口语序数 - 第几个", input: "排第五个", expected: "排第5个" },
  { name: "口语时间 - 几小时", input: "等了三小时", expected: "等了三小时" },
  { name: "口语距离 - 几公里", input: "走了五公里", expected: "走了五公里" },
  { name: "口语重量 - 几斤", input: "买了两斤苹果", expected: "买了两斤苹果" },
  { name: "口语天数", input: "待了三天", expected: "待了三天" },
  { name: "口语次数", input: "去了两次", expected: "去了两次" },
  { name: "口语人数", input: "有五个人", expected: "有五个人" },
  { name: "口语件数", input: "三件衣服", expected: "三件衣服" },
  { name: "口语房间数", input: "两个房间", expected: "两个房间" },
  { name: "口语天数 - 几天", input: "休息了几天", expected: "休息了几天" },
  { name: "口语月数", input: "等了两个月", expected: "等了两个月" },
  { name: "口语年数", input: "住了三年", expected: "住了三年" },
  { name: "品牌词千问ASR保持原文", input: "千问ASR", expected: "千问ASR" },
  { name: "短数字连英文保持原文", input: "千万ASR", expected: "千万ASR" },
  { name: "千问ASR误识别-长数字", input: "10000000个a s r", expected: "千问ASR" },
  { name: "千问ASR误识别-千字变数字", input: "1000问ASR", expected: "千问ASR" },
  { name: "长串数字归一", input: "一二三四", expected: "1234" },
  { name: "短串数字默认保留", input: "一二", expected: "一二" },
  { name: "短串数字带通用量词默认保留", input: "一二个", expected: "12个" },
  { name: "短串数字无量词保留", input: "来 一二 跳", expected: "来 一二 跳" },
  { name: "短串数字有单位归一", input: "二零年", expected: "20年" },
  { name: "百分号归一", input: "三十%", expected: "30%" },
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

describe("English tech term protection", () => {
  it("preserves API acronym in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("调用这个 API 接口", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("调用这个 API 接口");
  });

  it("preserves SDK acronym in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("使用这个 SDK 构建应用", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("使用这个 SDK 构建应用");
  });

  it("preserves multiple tech acronyms in one sentence", () => {
    const result = canonicalizeDictationText("通过 HTTP 请求获取 JSON 数据", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("通过 HTTP 请求获取 JSON 数据");
  });

  it("preserves IDE and editor names", () => {
    const result = canonicalizeDictationText("在 VSCode 或 IDE 中打开", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("在 VSCode 或 IDE 中打开");
  });

  it("preserves framework and library names", () => {
    const result = canonicalizeDictationText("使用 React 和 TypeScript 开发", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("使用 React 和 TypeScript 开发");
  });

  it("preserves cloud platform names", () => {
    const result = canonicalizeDictationText("部署到 AWS 或 Azure", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("部署到 AWS 或 Azure");
  });

  it("preserves protocol names", () => {
    const result = canonicalizeDictationText("通过 REST API 和 GraphQL 查询", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("通过 REST API 和 GraphQL 查询");
  });

  it("preserves tool names while still normalizing numbers", () => {
    const result = canonicalizeDictationText("用 Webpack 打包三百个文件", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("用 Webpack 打包300个文件");
  });

  it("preserves GitHub and GitLab names", () => {
    const result = canonicalizeDictationText("推送到 GitHub 或 GitLab", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("推送到 GitHub 或 GitLab");
  });

  it("preserves npm and package manager names", () => {
    const result = canonicalizeDictationText("用 npm 安装依赖", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("用 npm 安装依赖");
  });

  it("preserves Docker and Kubernetes names", () => {
    const result = canonicalizeDictationText("用 Docker 和 Kubernetes 部署", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("用 Docker 和 Kubernetes 部署");
  });

  it("preserves language names like Python Java Go", () => {
    const result = canonicalizeDictationText("用 Python Java 和 Go 编写", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("用 Python Java 和 Go 编写");
  });

  it("preserves testing framework names", () => {
    const result = canonicalizeDictationText("用 Jest 和 Vitest 测试", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("用 Jest 和 Vitest 测试");
  });

  it("preserves URL and web tech terms", () => {
    const result = canonicalizeDictationText("检查 URL 和 HTTP 状态", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("检查 URL 和 HTTP 状态");
  });

  it("preserves AI assistant and IDE names", () => {
    const result = canonicalizeDictationText("使用 Cursor 和 Copilot 编程", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("使用 Cursor 和 Copilot 编程");
  });

  it("preserves Claude AI name", () => {
    const result = canonicalizeDictationText("问 Claude 这个问题", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("问 Claude 这个问题");
  });

  it("preserves DeepSeek and Qwen AI names", () => {
    const result = canonicalizeDictationText("对比 DeepSeek 和 Qwen 模型", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("对比 DeepSeek 和 Qwen 模型");
  });

  it("preserves ChatGPT name", () => {
    const result = canonicalizeDictationText("用 ChatGPT 生成代码", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("用 ChatGPT 生成代码");
  });

  it("preserves AI names while still normalizing numbers", () => {
    const result = canonicalizeDictationText("用 Claude 处理三百个文件", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("用 Claude 处理300个文件");
  });

  it("preserves common programming term error in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("这个 error 需要修复", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("这个 error 需要修复");
  });

  it("preserves common programming term bug in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("遇到 bug 了", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("遇到 bug 了");
  });

  it("preserves common programming term function in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("写一个 function", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("写一个 function");
  });

  it("preserves common programming term class in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("实现 class", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("实现 class");
  });

  it("preserves common programming term interface in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("定义 interface", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("定义 interface");
  });

  it("preserves common programming term config in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("检查 config 文件", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("检查 config 文件");
  });

  it("preserves common programming term build in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("运行 build 命令", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("运行 build 命令");
  });

  it("preserves common programming term commit in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("提交 commit", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("提交 commit");
  });

  it("preserves common programming term branch in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("创建 branch", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("创建 branch");
  });

  it("preserves common programming term log in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("查看 log", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("查看 log");
  });

  it("preserves multiple common programming terms in one sentence", () => {
    const result = canonicalizeDictationText("这个 error 和 bug 需要修复", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("这个 error 和 bug 需要修复");
  });

  it("preserves common programming terms while still normalizing numbers", () => {
    const result = canonicalizeDictationText("这个 error 有三百个", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("这个 error 有300个");
  });

  it("preserves JavaScript keywords in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("使用 async await 和 promise", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("使用 async await 和 promise");
  });

  it("preserves TypeScript keywords in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("定义 interface 和 type", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("定义 interface 和 type");
  });

  it("preserves git terms in mixed Chinese-English text", () => {
    const result = canonicalizeDictationText("执行 git commit 和 merge", {
      preferredLanguage: "zh-CN",
      locale: "zh-CN",
      source: "unit-test",
    });
    expect(result.text).toBe("执行 git commit 和 merge");
  });
});
