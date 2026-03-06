# Checkpoint Record - 2026-03-06

## Purpose

Create a safe rollback point before public upload.  
This checkpoint captures the current stabilization state accepted by the maintainer.

## Accepted Scope (maintainer confirmed)

1. Paste functionality and fallback flow.
2. Smart dictionary behavior.
3. Environment/runtime configuration hardening.

## Known Issue

In some environments, output can still drift into answer-like assistant text instead of strict speech-to-text transcription.  
Current direction is to keep intelligent-layer logic stricter to reduce drift.

## Upload Scope (this checkpoint branch)

- `README.md`
- `A7_INTEGRATION_REPORT_20260306.md`
- `main.js`
- `scripts/build-windows-fast-paste.js`
- `scripts/start-dev-pinned.ps1`
- `scripts/verify-runtime-and-paste.ps1`
- `scripts/watch-paste-protocol.ps1`
- `src/App.jsx`
- `src/config/prompts.ts`
- `src/helpers/audioManager.js`
- `src/helpers/clipboard.js`
- `src/helpers/ipcHandlers.js`
- `src/helpers/textEditMonitor.js`
- `src/helpers/windowManager.js`
- `src/services/ReasoningService.ts`

## Release Safety

- Savepoint commit and tag are required.
- Upload target is a dedicated checkpoint branch, not direct push to `main`.
