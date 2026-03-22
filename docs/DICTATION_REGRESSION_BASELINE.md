# Dictation Regression Baseline

Date: 2026-03-22  
Branch: `codex/dual-machine-hardening`

Purpose: fixed baseline checks for cross-machine validation (Mac/Windows).

## Case Matrix

| Case | Intent | Provider/Model | Source | Candidate | Expected Output |
| --- | --- | --- | --- | --- | --- |
| C1 | question-no-answer-drift | test / test-model | `五加五等于几` | `10` | `五加五等于几` |
| C2 | answer-style-block | test / test-model | `今天我们讨论一下发布计划，先把周一任务排好` | `作为AI助手，我建议你先确定优先级。` | `今天我们讨论一下发布计划，先把周一任务排好` |
| C3 | normal-cleanup-pass | test / test-model | `嗯 我们明天下午三点在会议室开项目评审会，重点看发布风险` | `我们明天下午三点在会议室开项目评审会，重点看发布风险。` | `我们明天下午三点在会议室开项目评审会，重点看发布风险。` |

## How to Run

```bash
source ~/.zshrc
nvm use 22
npx -y tsx -e '/* see command history from 2026-03-22 migration */'
```

For Windows, run the same command in PowerShell with Node `22.22.1` active.
