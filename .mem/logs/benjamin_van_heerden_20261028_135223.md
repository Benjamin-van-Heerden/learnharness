---
created_at: "2026-10-28T13:52:23+02:00"
user: benjamin_van_heerden
spec: daily_driver_desktop_build_upstream_tracking
---

# Work Log - Daily-driver desktop build, upstream watcher, single-branch mode

## Goal

Make the fork usable as the user's daily LearnHarness app on their Mac: build it, install it, change it, rebuild it with data intact, and see upstream releases at every onboard so intake is deliberate. Keep `docs/architecture.md` describing this fork's code.

## What Was Accomplished

### Environment (2026-10-26/27)
- Created `.mem/structure.md`. Confirmed that the failing subscription test was a Node 22 problem: it passes on Node 26.
- Moved the asdf global to Node 26.12.1 (`~/.tool-versions` → `~/dotfiles/home/.tool-versions`) and reinstalled the global CLIs under 26.
- Removed asdf Node 22.19.0, the Homebrew `node` 25.5.0 keg, and the Homebrew-global `claude-code` and `codex` npm packages.

### Updates off in local builds (`electron/main.cjs`)
- `setupAutoUpdater()` returns early, with status `disabled`, when the packaged `package.json` has `lhLocalBuild: true`:
  ```js
  if (require("../package.json").lhLocalBuild === true) {
  	log("auto-update: local build — updater disabled");
  	reportUpdateStatus("disabled");
  	return;
  }
  ```
- `tests/automatic-updates.test.ts`: two new cases; 30/30 pass.

### `npm run desktop:local` (`scripts/desktop-local.sh`)
- Builds the pushed `origin/dev` in a detached worktree at `../learnharness-build`, beside the repo. It refuses a worktree with tracked edits.
- Runs `npm ci` only when `package-lock.json` changes (stamp file `node_modules/.desktop-local-lock`).
- Runs `next build`, then restores `next-env.d.ts`, which `next build` rewrites. Then the provider-runtime smoke, `build-server.mjs`, and `smoke-server.mjs --electron`.
- Then `electron-builder --mac --arm64 --dir --publish never -c.mac.identity=- -c.mac.hardenedRuntime=false -c.mac.notarize=false -c.extraMetadata.lhLocalBuild=true`.
- Quits a running LearnHarness via osascript, waits for every process to exit, then replaces `/Applications/LearnHarness.app` with `ditto`.

### Onboard runnables and memory
- `.mem/runnables/upstream`:
  - fetches upstream tags;
  - lists the `v*` releases on `origin/main` that `dev` hasn't merged, with their GitHub release notes;
  - groups the changed files into risk areas;
  - prints an intake instruction.
  - With nothing waiting, it prints one line.
- `.mem/runnables/architecture` prints the heading outline of `docs/architecture.md`.
- Added the project memory `architecture`: the doc describes this fork, is updated in the same commit as a change it describes, and is reconciled at upstream merges.

### Docs
- Brought `docs/architecture.md` in line with the code:
  - practice as a chat kind;
  - native `LhMessage` records;
  - the turn sequence;
  - ports and adapters;
  - events;
  - search;
  - the Electron process boundaries;
  - auto-update and `lhLocalBuild`;
  - deviations, seams and history.
- Wrote `docs/fork-workflow.md`.

### Single-branch mode (2026-10-28)
- The new mem v0.11.0 single-branch mode was built in the mem repo, in a separate session.
- `.mem/config.toml` `[git]` is now `development = 'dev'`, `single_branch = true`, `base = 'main'`, `protect = true`.
- `mem onboard` refreshed AGENTS.md to the single-branch variant. Rule 3 is now "never commit to or push the base branch", and the Releases section says mem makes no releases here. Onboard no longer shows a RELEASES section.
- Deleted the `test` and `release` branches on origin and locally. Both were at `3dc8847`, an ancestor of `main`.
- Moved the worktree with `git worktree move ../learnharness-release ../learnharness-build`.

### First real install (verified)
- `npm run desktop:local` built `f6fabe4` and installed `/Applications/LearnHarness.app`.
- `codesign -dv` shows `Signature=adhoc`, and `codesign --verify --deep` passes.
- The log shows `data dir: ~/Library/Application Support/LearnHarness/data` and `auto-update: local build — updater disabled`.
- Settings → General shows only "Version 0.3.8" and "Release notes", with no update controls.
- A second run, with the app open, quit it, reinstalled, and left the data folder unchanged. The folder held no files yet: models aren't set up, so no session had run.

## Decisions

- **Name:** keep the name LearnHarness (the user briefly considered "Radix" and withdrew it).
- **Updates:** auto-update is off in fork builds. Upstream's feed would replace the fork build with upstream's.
- **Signing:** ad-hoc signing, no notarization. The user doesn't need the microphone or dictation; they use superwhisper.
- **Architecture doc:** `docs/architecture.md` is edited in place to describe our code. Upstream's edits to it are reconciled at merge time, never taken wholesale from either side.
- **Single-branch mode instead of promoting:**
  - Nothing deploys from branches in this fork, so `test`/`release` were ceremony.
  - Promoting was also harmful: `mem promote production` pushes a `v*` date tag. GitHub Actions is enabled on the fork, and the inherited upstream `release.yml` runs on any `v*` tag.
  - So the daily app is built from the pushed `dev`, and the user keeps `main` as the upstream mirror (`base`).
  - This replaces the earlier decision to build from `release`.

## Key Files Affected

- `electron/main.cjs`: the `lhLocalBuild` early return in `setupAutoUpdater()`.
- `tests/automatic-updates.test.ts`: local-build cases; the fixture intercepts `../package.json`.
- `scripts/desktop-local.sh` (new) and `package.json` (`desktop:local` script).
- `.mem/runnables/upstream` (rewritten) and `.mem/runnables/architecture` (new).
- `.mem/config.toml`: single-branch mode.
- `AGENTS.md`: the `architecture` memory, and the single-branch mem block.
- `docs/architecture.md`, `docs/fork-workflow.md` (new) and `.mem/structure.md`.
- `.mem/specs/daily_driver_desktop_build_upstream_tracking/`: the spec and its 7 tasks, now archived by `mem spec complete`.
- Outside the repo:
  - `../learnharness-build`, the build worktree with about 1 GB of `node_modules`;
  - `/Applications/LearnHarness.app`;
  - `~/Library/Application Support/LearnHarness/`;
  - the asdf and Homebrew changes above;
  - `~/dotfiles/home/.tool-versions`, which isn't committed in the dotfiles repo.

## Notes

- `npx asar extract-file` run in the repo root overwrote the repo's `package.json` with the packaged copy. It was restored from git. Extract packaged files only in a scratch directory.
- `next build` rewrites `next-env.d.ts` (`.next/dev/types` → `.next/types`). Without the restore, every rebuild after the first fails the worktree's dirty check.
- `timeout` isn't on macOS. In zsh, an unquoted `echo =====` fails because of `=` expansion.
- `brew cleanup node` skipped the 25.5.0 keg ("most recent version not installed"). It was removed with `rm -rf` after checking that it wasn't linked.
- The installed app's Settings → Providers already showed an OpenRouter key and a Tavily key while `auth.json` was absent. They likely come from environment variables in the launch environment; this wasn't investigated.
- Upstream v0.3.9 (2026-10-27) is waiting, with 44 upstream commits not yet merged into `dev`. Nothing was merged.
