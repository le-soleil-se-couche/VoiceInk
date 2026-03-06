# A7 Integration Report (2026-03-06)

## Scope

- Branch: `agent/a7-integration-qa-release`
- Base snapshot: `wip/multi-agent-base-20260306` @ `46a5ad4`
- Merge order executed:
  1. `agent/a1-auth-byok-gating`
  2. `agent/a4-dictionary-import-performance`
  3. `agent/a2-transcription-reliability`
  4. `agent/a3-paste-fallback-ux`
  5. `agent/a5-reasoning-context-strict`
  6. `agent/a6-auto-learn-hardening`

Result: all merges returned `Already up to date` (no branch deltas yet).

## Quality Gates

Commands executed in `agent/a7-integration-qa-release` worktree:

1. `npm ci` -> pass
2. `npm run typecheck` -> pass
3. `npm run build:renderer` -> pass (chunk-size warning only)
4. `npm run lint` -> pass with `0 errors, 21 warnings` (legacy warnings)

## Contract Checks (Static)

Verified in code:

1. `parseDictionaryInput(text: string, existingWords?: string[])` equivalent exists:
   - `src/utils/parseDictionaryInput.ts`
2. `getSystemPrompt(...)` supports context:
   - `src/config/prompts.ts`
   - call path through `BaseReasoningService` / `ReasoningService`
3. `ContextClassification` and context chain exist:
   - `src/utils/contextClassifier.ts`
   - `audioManager` path uses `getTargetAppInfo -> classifyContext -> reasoning config`
4. `PasteResult.reason` literal union exists with expected values:
   - `src/types/electron.ts`

## Global Acceptance Matrix

Legend:
- `PASS-AUTO`: verified by automated command
- `PASS-STATIC`: verified by static code inspection
- `UNRUN`: requires runtime/manual scenario validation

1. Custom URL + Qwen ASR (no forced `/audio/transcriptions`) -> `PASS-STATIC`
2. Custom URL + non-Qwen multipart route -> `PASS-STATIC`
3. API no response -> timeout error surfaced -> `PASS-STATIC`
4. No `NEON_AUTH_URL`: cloud locked, BYOK available -> `PASS-STATIC`
5. Auth URL present but unsigned-in: login + BYOK available -> `PASS-STATIC`
6. No paste target -> `mode=copied`, panel stays visible -> `PASS-STATIC`
7. Paste success -> `mode=pasted` normal finish -> `PASS-STATIC`
8. Dictionary complex parsing (2+ spaces, quotes, dedupe) -> `PASS-STATIC`
9. Dictionary 1000 items smooth scrolling/input -> `UNRUN`
10. Strict mode low-overlap fallback -> `PASS-STATIC`
11. Auto-learn: replacement learns, rewrite ignored -> `PASS-STATIC`
12. Undo learned corrections syncs UI -> `UNRUN`

## Risks / Blockers

1. Agent branches `A1-A6` currently have no independent commits, so A7 integration is effectively baseline validation only.
2. Scenarios #9 and #12 need runtime/manual validation evidence before release sign-off.
3. Transcription timeout currently uses configured constants; dynamic timeout ramping to audio duration (max 90s) is not fully verified in this run.

## Next Actions

1. Have A1-A6 land branch-specific commits, then rerun this exact A7 merge order.
2. Execute manual runtime test plan for scenarios #9 and #12 and attach logs/video evidence.
3. Re-run:
   - `npm run typecheck`
   - `npm run build:renderer`
   - `npm run lint`

