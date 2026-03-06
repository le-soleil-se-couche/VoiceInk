<p align="center">
  <img src="src/assets/logo.svg" alt="VoiceInk" width="120" />
</p>

<h1 align="center">VoiceInk</h1>

<p align="center">
  开源桌面听写应用（macOS / Windows / Linux）<br/>
  基于 OpenWhispr 架构，面向中文/英文输入场景做了专项优化
</p>

## Project Notice (Public Release)

- This project is an **open-source desktop dictation app** that converts speech to text with local and cloud model options.
- **Default mode is BYOK (Bring Your Own Key)**: users provide their own API key / endpoint for cloud providers, or use local models.
- This repository is a **community fork based on OpenWhispr** (roughly **95% inherited architecture / implementation**) and is **not affiliated with Typeless or OpenWhispr official hosted services**.

- **Project status: Maintenance mode / archived release track**. Core features are considered complete, and only minimal follow-up is expected.

---

## 对外说明


本项目整体架构约 95% 基于 OpenWhispr（Open Whisper 社区项目）实现，在其基础上针对日常中文/英文输入体验做了增强。

> 当前公开版本的“工程级优化”主要在 **Windows** 平台验证与打磨；macOS/Linux 以基础可用为目标。

### 当前定位

- 开源桌面听写工具（非 SaaS）
- 默认 BYOK 模式，不绑定订阅制
- 接受 issue；PR 可能会审核合并，但维护频率较低（维护模式）

---

## 主要增强

1. **上下文检测与输入环境路由**
   - 可安全输入场景：尝试自动粘贴到当前光标位置。
   - 非输入场景或无法安全粘贴：自动降级到底部复制面板，避免误输入。

2. **粘贴回退优化（重点）**
   - 当系统检测到“当前不可粘贴”时，不再强行输入。
   - 文本会停留在复制面板/剪贴板，用户可直接 `Ctrl+V` / `Cmd+V` 手动粘贴。

3. **智能词典**
   - 支持自定义词典、批量导入。

   - 批量导入规则：文本按空白拆分后，空格长度 `>=2` 即视为有效词条；实测可直接复制 Typeless 词库并一键导入。
   - 可将词典提示注入到转录/后处理链路，提升术语命中率。

4. **纠错自动学习（可选）**
   - 用户手动修正后，可回流词典，持续优化后续识别效果。

5. **发现并接入了两个极快模型链路**
   - 面向短文本实时润色/后处理场景，优先低延迟体验。
   - **ASR**：千问链路（`qwen-3.5-plus` / `qwen3-asr-flash` / DashScope）
     - 在中文口语、方言和中文工作流场景通常更稳定，网络路径也较友好。
     - `qwen3-asr-flash-realtime`（2026-02-13 快照）目前实测不可用，暂不推荐。
   - **LLM 润色**：Cerebras `gpt-oss-120b`（high）
 
6. **智能层做了更严格约束**
   - 为降低“模型回答问题而非转录”的风险，当前对智能层行为进行了较强限制。
   - 这会在一定程度上限制智能词典与语义改写能力，属于“稳定优先”的权衡。

---

## BYOK / 可选账号模式

### 自有渠道模式（通常称 BYOK）

- 使用者提供自己的 API Key 与模型端点（或兼容网关）。
- 额度与费用由使用者对应平台账号结算。
- 本项目本身不承诺代付、代管、代计费。

### 可选账号模式（非默认）

- 仅在你自行部署兼容登录/鉴权/计费后端时启用。
- 普通 BYOK / 本地模式不需要账号系统。

---

## 低延迟推荐链路（短文本实时润色）

> 以下速度与价格来自公开资料和第三方实测整理，可能随时间变化，请以官方页面为准。
> 
- **ASR**：千问链路（`qwen-3.5-plus` / `qwen3-asr-flash` / DashScope）
  - 在中文口语、方言和中文工作流场景通常更稳定，网络路径也较友好。
  - `qwen3-asr-flash-realtime`（2026-02-13 快照）目前实测不可用，暂不推荐。
- **LLM 润色**：Cerebras `gpt-oss-120b`（high）


### 可选润色模型

- Cerebras `gpt-oss-120b`（默认）：质量优先，速度也足够快
- Mercury 2（Inception Labs）：低延迟实时润色表现突出
- Cerebras `llama-3.1-8b`：极低成本 / 高吞吐
- Groq `llama-3.3-70b-versatile`：一个 Key 覆盖 ASR + LLM，部署省事

### 参考对比（短文本润色）

| 推荐顺序 | 提供商 + 模型                | 速度/延迟（参考）     | 价格（参考）               | OpenAI 兼容 |
| -------- | ---------------------------- | --------------------- | -------------------------- | ----------- |
| 1        | Cerebras gpt-oss-120B (high) | ~2248 t/s             | $0.45/M tokens             | 是          |
| 2        | Mercury 2                    | ~1196 t/s             | $0.25/M 输入, $0.75/M 输出 | 是          |
| 3        | Groq Llama 3.3 70B           | ~276 t/s, TTFT ~0.22s | 按 token 计费              | 是          |
| 4        | Cerebras Llama 3.1 8B        | 2200+ t/s             | $0.10/M tokens             | 是          |

### 为什么默认推荐 gpt-oss-120B

- 在本项目“全局润色”场景下，质量与稳定性更平衡。
- 即使单价高于 8B，在免费额度范围内很多个人场景仍可低成本使用。
- OpenAI 协议兼容，迁移成本低。

### Cerebras 定价层级（参考）

| 层级              | 费用                   | 额度                 |
| ----------------- | ---------------------- | -------------------- |
| Free              | $0                     | 每天约 100 万 tokens |
| Developer (PayGo) | 最低充值 $10，按量计费 | 速率限制高于免费层   |
| Enterprise        | 联系销售               | 最高速率 + 专属队列  |

### 兼容性说明

- 千问 / DashScope 支持 OpenAI compatible mode。
- 对支持自定义 OpenAI Base URL 的客户端，通常可直接接入。
- 常用 Base URL（北京）：`https://dashscope.aliyuncs.com/compatible-mode/v1`

### 示例环境变量

```bash
# ASR (Qwen / DashScope, OpenAI-compatible)
DASHSCOPE_API_KEY=your_dashscope_key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
# model: qwen-3.5-plus

# LLM polish (default recommendation)
OPENAI_API_KEY=your_cerebras_key
OPENAI_BASE_URL=https://api.cerebras.ai/v1
# model: gpt-oss-120b

# Alternative: Mercury 2
# MERCURY_API_KEY=your_mercury_key
# MERCURY_BASE_URL=https://api.inceptionlabs.ai/v1
# MERCURY_MODEL=mercury-2
```

---

## Windows 启动方式

**安装包用户（推荐）**：直接运行 NSIS 安装程序，安装器会自动在桌面和开始菜单创建 `VoiceInk` 快捷方式，双击即可。

**源码 / 便携版用户**：仓库提供了 `core/` 启动器，避免双击 `.bat` 时出现黑色命令行窗口：

- `core/VoiceInk-Launch.vbs`：推荐入口，静默启动（无黑框闪屏）。
- `core/VoiceInk-Launch.bat`：启动逻辑，优先找 `dist\win-unpacked\VoiceInk.exe`，若不存在则回退到 `npm start`。
- `core/Create-VoiceInk-DesktopShortcut.ps1`：为源码用户创建桌面快捷方式。

```powershell
# 在仓库根目录执行（Windows PowerShell）
powershell -ExecutionPolicy Bypass -File .\core\Create-VoiceInk-DesktopShortcut.ps1
```

## Quick Start

```bash
git clone https://github.com/le-soleil-se-couche/VoiceInk.git
cd VoiceInk
npm install
npm run dev
```

Build:

```bash
npm run build
```

> 需要更多平台打包/本地模型说明，可查看仓库内 `LOCAL_WHISPER_SETUP.md`、`WINDOWS_TROUBLESHOOTING.md`、`TROUBLESHOOTING.md`。

---

## Legal & Risk Disclosure

1. 本项目按 MIT License 提供，不附带任何明示或暗示担保。
2. 使用云端模型时，数据将按你所选提供商策略处理；请自行确认其隐私政策与合规要求。
3. 语音转文本和智能后处理可能出现误识别、误改写，涉及法律、医疗、财务等高风险场景请务必人工复核。
4. 本项目不提供投资、医疗、法律等专业建议功能。

---

## Upstream & References

- OpenWhispr 原始仓库: https://github.com/OpenWhispr/openwhispr
- Cerebras 免费 Key: https://cloud.cerebras.ai
- Cerebras 快速开始: https://inference-docs.cerebras.ai/quickstart
- Cerebras 定价: https://www.cerebras.ai/pricing
- Cerebras API 文档: https://inference-docs.cerebras.ai
- Cerebras Playground: https://chat.cerebras.ai
- Cerebras GitHub 示例: https://github.com/Cerebras/inference-examples
- Artificial Analysis（Cerebras）: https://artificialanalysis.ai/providers/cerebras

> **千问 ASR / DashScope 入口**
>
> **[大模型服务平台百炼控制台](https://bailian.console.aliyun.com/)**
> — 在此申请 DashScope API Key，开通 `qwen3-asr-flash` / `qwen-3.5-plus` 等模型权限。

---

## License

MIT. See [LICENSE](LICENSE).
