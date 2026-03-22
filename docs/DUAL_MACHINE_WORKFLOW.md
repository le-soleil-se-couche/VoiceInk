# Dual-Machine Development Workflow (Mac + Windows)

This repository follows a Git-first workflow for cross-machine development.

## 1) Workspace policy

- Keep `_ARCHIVE/openwhispr` in Google Drive as read-only backup.
- Do daily work only in external local directories:
  - macOS: `/Users/ewin/Dev/voiceink-active`
  - Windows: `D:\Dev\voiceink-active`

## 2) One-time machine setup

### Git (both machines)

```bash
git config --global core.autocrlf false
git config --global core.filemode false
git config --global fetch.prune true
```

### Windows only

```powershell
git config --global core.longpaths true
```

### Node

- Use `nvm` and run `nvm use` in repo root (`.nvmrc` is pinned to `22.22.1`).

## 3) Daily switch routine

### Before leaving current machine

```bash
git status
git add -A
git commit -m "..."
git push
```

### When starting on the other machine

```bash
git fetch --all --prune
git pull --rebase
git status
```

Do not keep unsynced work on both machines at the same time.

## 4) Build parity check

Run on both machines after environment changes:

```bash
npm ci
npm run typecheck
npm run lint
npm run build:renderer
```

Expected result: no errors. Existing warnings are allowed unless they regress.

## 5) Regression scenarios for dictation cleanup

Run these on both machines after major changes:

1. Short sentence cleanup (quality should not be overly degraded).
2. Question-like input should not turn into assistant answer mode.
3. Wake-prefix input should only be cleaned, not executed as command.

Record provider/model/input text and output for future fixed regression checks.
