# 任务目标
- 为千问 API 建立可持续、可定位的统一存放目录，并准备好后续 autoresearch/VoiceInk 迭代可直接使用的配置入口。

# 详细执行计划（walk through）
1. 扫描常见目录，定位现有千问 API 相关配置（若存在）。
2. 创建统一 secrets 目录与标准 env 文件模板。
3. 在仓库中新增读取该 secrets 文件的说明/脚本入口。
4. 验证路径可用并输出后续调用方式。

# To Do List
- [x] 扫描并确认现有千问 API 配置位置
- [x] 创建统一 secrets 目录与权限
- [x] 新增可复用的加载脚本与使用说明
- [x] 运行验证并记录结果

# 执行记录（完成时间与结果）
- 2026-03-26 17:15: 初始化任务计划文档。
- 2026-03-26 17:17: 扫描完成；在 `/Users/ewin/Library/Application Support/VoiceInk-development/.env` 中发现已存在 `CUSTOM_TRANSCRIPTION_API_KEY` 与 `CUSTOM_REASONING_API_KEY`（值已脱敏）。
- 2026-03-26 17:18: 创建统一 secrets 目录 `/Users/ewin/.voiceink-secrets`（700）与 `qwen.env`（600），并迁移现有 CUSTOM API keys。
- 2026-03-26 17:20: 增加 `scripts/print-voiceink-secrets-exports.sh`，并在 README 增加本机 secrets 统一路径与注入命令。
- 2026-03-26 17:22: 验证通过：secrets 注入脚本可导出 `CUSTOM_TRANSCRIPTION_API_KEY` / `CUSTOM_REASONING_API_KEY`；`npm run typecheck` 通过，`npm run lint` 无新增 error（仅基线 warnings）。
- 2026-03-26 17:23: 提交并推送 `7a49ce8` 到 `codex/dual-machine-hardening`。
