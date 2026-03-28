# 任务目标
- 修复：快捷键列表更新后，悬浮图标应实时显示当前有效快捷键，不再出现提示文本滞后。

# 详细执行计划（walk through）
1. 梳理悬浮图标快捷键显示的数据来源与事件更新链路。
2. 在渲染层补齐“有效快捷键变更”到 settings store 的即时同步。
3. 验证 fallback 场景和常规场景下 tooltip 文案是否立即刷新。
4. 运行静态检查并提交变更。

# To Do List
- [x] 定位 hotkey 显示与更新逻辑相关文件
- [x] 实现 fallback 事件触发时的 store 实时同步
- [x] 本地运行 typecheck/lint 验证无回归
- [x] 更新执行记录并整理提交说明

# 执行记录（完成时间与结果）
- 2026-03-25 20:05: 初始化任务计划文档。
- 2026-03-25 20:07: 完成链路定位，确认 `App.jsx` tooltip 读取 store 中 `dictationKey`，而 fallback 事件仅写 localStorage 未同步 store，导致悬浮图标显示滞后。
- 2026-03-25 20:09: 已在 `App.jsx` 的 `onHotkeyFallbackUsed` 回调中新增 fallback 快捷键的实时同步（localStorage + Zustand store）。
- 2026-03-25 20:10: 运行 `npm run typecheck` 与 `npm run lint`，均通过；lint 仅有项目基线 warning，无新增 error。
- 2026-03-25 20:11: 提交 `cd00f0b` 并推送到 `origin/codex/dual-machine-hardening`。
