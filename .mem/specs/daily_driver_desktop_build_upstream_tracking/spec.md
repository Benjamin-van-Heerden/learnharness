---
title: Daily-driver desktop build and upstream tracking
status: active
assigned_to: benjamin_van_heerden
created_at: "2026-10-27T12:04:45+02:00"
updated_at: "2026-10-27T12:09:32+02:00"
---

## Overview

Make this fork usable as the user's daily learning app on their own Mac, and keep it in step with a fast-moving upstream (amosblomqvist/learnharness ships about one release a day).

Four parts:

1. **Local desktop build.** One command builds the macOS app from the `release` branch and installs it as `/Applications/LearnHarness.app`. The build is ad-hoc signed, not notarized, and has auto-update switched off. Data lives in `~/Library/Application Support/LearnHarness/`, outside the repo, so tests and branch work never touch it.
2. **Upstream watcher.** The onboard runnable `.mem/runnables/upstream` reports upstream releases and commits that `dev` hasn't merged. For each waiting release it prints the release notes, plus the changed files in risky areas, so new releases get a deliberate review before they are merged.
3. **Architecture doc as ours.** `docs/architecture.md` describes this fork's code. It is brought in line with the code now. A project memory keeps it current with every change and with every upstream merge. A new onboard runnable prints its headings, so sessions know what it covers without reading all of it.
4. **Workflow doc.** A short doc describes the build, use, change, promote, rebuild and upstream-intake loop.

User decisions (2026-10-27): keep the name LearnHarness (no rename); auto-update off in fork builds; ad-hoc signing (dictation is not needed; the user uses superwhisper); the daily app is built from the `release` branch; `docs/architecture.md` is edited in place to describe our code, and conflicts with upstream's edits are resolved at merge time.

## Goals

- The user can install the fork as a desktop app, use it daily, change it, rebuild it, and keep using it with their data intact.
- A fork build can never replace itself with an upstream build.
- Every onboard shows what upstream has released that `dev` hasn't merged, with the release notes, so intake is deliberate.
- `docs/architecture.md` matches the code, and the process keeps it that way.

## Technical Approach

### 1. Updates off in local builds (`electron/main.cjs`)

- The build script injects a marker into the packaged `package.json` via electron-builder's `extraMetadata`: `-c.extraMetadata.lhLocalBuild=true`. The repo's `package.json` is not changed.
- `setupAutoUpdater()` reads `require("../package.json").lhLocalBuild`. When it is `true`, it logs `auto-update: local build — updater disabled`, calls `reportUpdateStatus("disabled")` and returns before loading electron-updater. This is the same path dev builds take. Settings → General already hides the check/restart controls for status `disabled` (`components/settings/update-settings.tsx`), and the menu's "Check for Updates…" becomes a no-op because `autoUpdater` stays null.
- Extend `tests/automatic-updates.test.ts`, which loads `main.cjs` in a vm with fake Electron, updater and filesystem: when the packaged package.json carries `lhLocalBuild: true`, the updater is never required, no check runs, and the status is `disabled`. The existing upstream behaviour without the marker must stay green.

### 2. Build-and-install script (`scripts/desktop-local.sh`, npm script `desktop:local`)

- Bash, run from the main checkout: `npm run desktop:local`.
- Maintains a persistent git worktree of the `release` branch at `../learnharness-release`, a sibling of the repo. It must not be inside the repo, or tsc, eslint and the Next tracer would pick it up.
  - The first run creates it with `git worktree add`.
  - Later runs `git fetch origin` and check out `origin/release` detached in the worktree. A dirty worktree makes the script stop with a message, never discard changes.
- Runs `npm ci` in the worktree on the first run, and again whenever `package-lock.json` differs from the last successful install (a stamp file in the worktree's `node_modules/`).
- Build steps, the same gates as `desktop:dist` minus signing and notarization:
  1. `rm -rf dist .next/standalone`
  2. `next build`
  3. `node scripts/smoke-provider-runtime.mjs`
  4. `node scripts/build-server.mjs`
  5. `node scripts/smoke-server.mjs`
  6. `DEVELOPER_DIR=${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer} npx electron-builder --mac --arm64 --dir --publish never -c.mac.identity=- -c.mac.hardenedRuntime=false -c.mac.notarize=false -c.extraMetadata.lhLocalBuild=true`
  - `--dir` produces only the `.app` (no DMG or ZIP), which is all a local install needs.
  - `identity: "-"` is required, not just convenient: left unset, electron-builder picks up any certificate in the keychain. Ad-hoc signing needs `hardenedRuntime: false`, per electron-builder 26.16.1's `macOptions.d.ts`.
- Install:
  - If LearnHarness is running, ask it to quit (`osascript -e 'quit app "LearnHarness"'`) and wait for it to exit.
  - Replace `/Applications/LearnHarness.app` with `dist/mac-arm64/LearnHarness.app` (remove the old bundle, then `ditto`).
  - Print the installed version and the commit it was built from.
- Any failed step stops the script before the installed app is touched.
- Add `"desktop:local": "bash scripts/desktop-local.sh"` to `package.json` scripts.

### 3. Upstream watcher (`.mem/runnables/upstream`)

Keep the current behaviour (`gh repo sync` of the fork's `main`, the count of `dev..origin/main`) and add:

- `git fetch -q upstream --tags`. The `upstream` remote is fetch-only.
- **Waiting releases:** tags matching `v*` that `origin/main` contains but `dev` doesn't (`git tag --merged origin/main --no-merged dev`), oldest first, previews included. For each one, a heading with the tag and release date, then its release notes from `gh release view <tag> --repo amosblomqvist/learnharness --json body`. Notes longer than about 60 lines are truncated, with a pointer to the full release page.
- **Risk areas:** when `dev..origin/main` is non-empty, list the changed files (`git diff --stat dev...origin/main`) in these groups, with a one-line reason each:
  - `package.json` / `package-lock.json`: needs `npm install`.
  - `electron/` or `electron-builder.yml`: the desktop shell; rebuild and smoke the app.
  - `src/core/contracts/`, `src/store/`, `tests/fixtures/golden-data/`: on-disk formats; check that existing data still reads.
  - `docs/architecture.md`: reconcile with our version.
  - `AGENTS.md`: upstream's agent rules.
- **When anything is waiting**, print an instruction for the agent:
  - Tell the user what is waiting and summarise the release notes.
  - Recommend reviewing before merging, and merge only when the user asks.
  - After a merge: run `npm install` if the lockfile changed, then typecheck and the tests related to the changes. Reconcile `docs/architecture.md` with the merged code. Remind the user to rebuild (`npm run desktop:local`) after promoting.
- When `gh` is missing or offline, degrade gracefully to the current warning lines.

### 4. Architecture doc as ours

- New onboard runnable `.mem/runnables/architecture`, executable. It prints the `##` and `###` headings of `docs/architecture.md` with line numbers, followed by one line: read the sections a change touches; keep them current.
- Project memory via `mem memory set architecture "<text>"`. Wording: "docs/architecture.md describes THIS fork's code, not upstream's. When a change alters what it describes (layers, import zones, systems, stores, on-disk formats, runtime flows, invariants, seams), update the affected sections in the same commit. When merging upstream, reconcile upstream's edits to it against our code rather than taking either side wholesale."
- Bring `docs/architecture.md` in line with the code now. The known drift, verified against the code on 2026-10-26:
  - §1, §4 and §7 describe a practice pipeline, `PracticeStore`, `data/practice`, `contracts/practice.ts`, `src/core/practice.ts` and `/practice` pages. In the code, practice is a chat `kind: "practice"`:
    - It runs `createPracticeAgent` with the `problem` and `conclude` tools (`src/agent/tools/practice.ts`).
    - The UI is `components/practice-dock.tsx` and `components/practice-cards.tsx`.
    - It writes only the chat record; extraction is skipped.
    - `chainsForSelection` lives in `src/core/chains.ts`.
  - §3 and §5 describe `server/pi/record-adapter.ts` and an AI SDK `UIMessage` SSE with `addToolOutput`. Records now store pi-native `LhMessage` (`src/core/native-messages.ts`, `asAgentMessages`). `server/pi/ui-stream.ts` (`runPiTurn`) streams pi agent events and supports reattach through `turn-runs.ts`. Steers are `LhMarkerMessage` with customType `subagent-steer`. Update the turn sequence: parse input, model gate, `ensureCompacted`, write-ahead save, `beginTurn`, agent, persist, extraction, dismissal, compaction.
  - §3 shows the extraction pipeline with an `embedder`; there is none.
  - §2 and §3 give route-handler counts of 16 or 28; there are 32.
  - §3 lists the ports as four, with `PracticeStore`. The ports are `ChatStore`, `GraphStore`, `JobStore`, `SettingsStore`, `PromptOverrideStore`, `AuthStore`. `stores.ts` wires chat, graph, jobs and settings; `keys.ts`, `model-catalog.ts`, `observability.ts` and the barrel import adapters directly.
  - §3 lists web tools as Google CSE and Readability/Jina. Search is Tavily/Brave (`src/server/search.ts`, `src/agent/tools/web.ts`).
  - §8 says Electron has one IPC channel. There are also the ChatGPT and subscription channels (`chatgpt-ipc.cjs`, `subscription-ipc.cjs`) and `proxy.ts` with the desktop API secret.
  - §10.2 attributes `activity-changed` to practice emitters that no longer exist.
  - The tool surfaces omit `explain`, `recall`, `send_to_user` and `pdf`. The prompt layout omits `prompts/shared/` and `prompts/practice/`.
  - The §11 render-test note says "no DOM library"; some tests use linkedom.
  - Re-check each claim against the code while editing, rather than trusting this list blindly.
- Then remove the "stale in places" bullet from `.mem/structure.md`, and add the new script and runnables to it.

### 5. Workflow doc (`docs/fork-workflow.md`)

A new file, not added to upstream's docs, so it never conflicts. Covers:

- The branches: `main` mirrors upstream, `dev` is development, `release` is what the daily app is built from.
- First install with `npm run desktop:local`, then adding API keys in the app's Settings.
- Where data lives (`~/Library/Application Support/LearnHarness/`) and that the build never touches it.
- The loop: change on `dev`, `mem promote production`, `npm run desktop:local`.
- Upstream intake: the onboard report, review, `git merge --no-ff origin/main`, the checks after a merge, promote, rebuild.
- That the app never updates itself.

Link it from `.mem/structure.md`.

## Success Criteria

- `electron/main.cjs` skips electron-updater when the packaged `package.json` has `lhLocalBuild: true`, and reports status `disabled`. `tests/automatic-updates.test.ts` covers this, and the existing cases pass.
- `npm run desktop:local` builds `origin/release` in `../learnharness-release` and installs `/Applications/LearnHarness.app`.
  - The installed app launches, opens a session, and Settings → General shows no update check controls.
  - `codesign -dv` on the app shows an ad-hoc signature.
  - Its data is under `~/Library/Application Support/LearnHarness/data`.
- Running `npm run desktop:local` a second time after a change is promoted installs the new build. Sessions, keys and settings from the first install are still there.
- A failure in any build step leaves the installed app untouched.
- `.mem/runnables/upstream` prints, for each upstream `v*` tag not in `dev`, the tag, date and release notes, plus risk-area file groups and an agent instruction when anything is waiting. With nothing waiting, it prints only the one-line summary.
- `.mem/runnables/architecture` prints the headings of `docs/architecture.md` at onboard.
- The `architecture` project memory exists in AGENTS.md's memories section.
- `docs/architecture.md` no longer contains the drift listed above. Every path and function it names exists in the code.
- `docs/fork-workflow.md` exists. `.mem/structure.md` lists the new script and runnables and no longer carries the stale-doc note.
- `npm run typecheck` and `npm run lint` are clean, and the touched tests pass.

## Notes

- **Order of operations:** the build script builds `release`, so the first real build needs this work promoted (`mem promote production`). Releases happen only when the user asks; the final task stops and asks for that.
- `docs/development.md` (Layout, Key mechanisms) has the same kind of drift. It is out of scope unless the user asks.
- The worktree's `node_modules` is about 1 GB. A full rebuild is expected to take a few minutes.
- The Node version is 26 (CI uses 26; Node 22 breaks `electron/subscriptions.cjs`). The user's global asdf default is already 26.12.1.
- `.mem/runnables/*` are shell scripts that onboard runs; they must stay fast and read-only, apart from the existing `gh repo sync` and fetch.
