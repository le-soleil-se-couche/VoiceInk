# Dictation Regression Baseline

Date: 2026-03-23  
Branch: `codex/dual-machine-hardening`

Purpose: fixed baseline checks for dictation safety guard + Chinese number/punctuation canonicalization stability.

## Runtime Config Baseline

- Mac (`darwin`) only:
  - `strictShortInputThreshold = 18`
  - `allowSafeShortPolish = true`
  - `strictMaxExpansionRatio = 1.35`
  - `strictMinOutputCoverage = 0.70`
  - ASR pre-guard enabled on:
    - `openwhispr-cloud` batch
    - streaming final transcript
  - ASR guard policy:
    - first answer-like hit => auto retry once
    - second answer-like hit => throw `ASR_ANSWER_LIKE_OUTPUT`
  - telemetry events:
    - `ASR_GUARD_RETRY_MAC`
    - `ASR_GUARD_BLOCKED_MAC`
- Windows/Linux:
  - no platform strategy change from current baseline
  - strict short-input behavior remains existing default (`24`, local cleanup fallback)
- All platforms (Chinese canonicalization):
  - final output flow is unified at `finalizeDictationOutput()`:
    - `basicDictationCleanup` (noise cleanup only)
    - `canonicalizeDictationText` (Chinese number/symbol contextual canonicalization)
    - dictionary normalization
  - language gating:
    - always enabled when `preferredLanguage` is `zh-CN` or `zh-TW`
    - enabled in `auto` only when Han ratio > 20%
  - localStorage flags (all default `true`):
    - `dictationCanonicalizerEnabled`
    - `dictationNumberCanonicalizerEnabled`
    - `dictationPunctuationCanonicalizerEnabled`
  - telemetry events:
    - `CANONICALIZER_APPLIED`
    - `CANONICALIZER_LITERAL_PROTECTED`
    - `CANONICALIZER_SKIPPED_TIMEOUT` (streaming hard limit)

## Case Matrix

| Case | Platform | Mode | Input / Situation | Expected |
| --- | --- | --- | --- | --- |
| A | macOS | cloud batch | `5+5等于几` | must not output assistant answer; guard retries once, then blocks if still answer-like |
| B | macOS | streaming | `作为AI助手...` style ASR output | must be blocked after retry with `ASR_ANSWER_LIKE_OUTPUT` |
| C | macOS | cloud batch or streaming | short colloquial sentence (`<18 chars`) | allow light polish only when overlap >= 0.85 and no answer-like pattern |
| D | macOS | cloud batch + streaming | same semantic sentence in both modes | both paths apply same pre-reasoning guard behavior |
| E | Windows | existing cloud path | same prompts as A/B/C | strategy-level behavior unchanged from pre-patch baseline |
| F | all | any final path | `二零二六年一月十五日` | `2026年1月15日` |
| G | all | any final path | `这个词是问号` | must keep literal mention unchanged |
| H | all | any final path | `会议结束句号` | `会议结束。` |
| I | all | any final path | idiom text (`一心一意`) | must remain idiom form |

## Validation Commands

```bash
source ~/.zshrc
nvm use 22.22.1
npm run typecheck
npm run lint
npm run build:renderer
npm run test:unit
```

Manual runtime validation should record: provider, model, source text, ASR raw output, final output, and whether `ASR_GUARD_RETRY_MAC` / `ASR_GUARD_BLOCKED_MAC` / canonicalizer events fired.
