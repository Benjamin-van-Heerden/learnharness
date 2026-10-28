---
created_at: "2026-10-28T16:26:46+02:00"
user: benjamin_van_heerden
spec: choosable_data_folder
---

# Work Log - Choosable data folder (data now in iCloud Drive)

## Goal

Let the user keep LearnHarness data in a folder they choose, here iCloud Drive, from Settings → General. The data must move safely, a missing folder must never cause a silent fallback, and secrets must stay in Application Support.

## What Was Accomplished

### `electron/data-location.cjs` (plain Node)
- The choice is stored in `<userData>/data-location.json` as `{ "dataDir": … }`, written atomically. With no file, the folder is the default `<userData>/data`. A corrupt file, or a relative path in it, is an error, never a fallback.
- `classifyFolder` returns missing, empty (Finder clutter counts as empty), learnharness (holds `chats/`, `graph/` or `settings.json`) or other.
- `checkPaths` refuses a target that is the current folder or sits inside it, either way round.
- `copyVerified` copies recursively and checks each file's size and SHA-256. Symlinks are refused. On failure it removes what it created and leaves the source untouched.
- `moveData(src, dst, { beforeDelete })` does the verified copy, then runs `beforeDelete` (main saves the new location there), then deletes the source.

### `electron/data-folder.cjs` (Electron flow; main injects its dependencies)
- `resolveAtStartup` runs once per launch. When the chosen folder is missing, or the setting is corrupt, a native dialog offers Try Again / Choose Another Folder… / Quit. Choose accepts only an empty or LearnHarness folder and saves it without moving anything.
- `registerDataFolderIPC` adds three channels:
  - `lh:data-folder:get` returns `{available, path, isDefault, defaultPath, defaultKind}`.
  - `:choose` opens the native folder picker and returns the folder's kind, including `current` and `nested`.
  - `:apply` validates first. It then stops the server and waits for it to exit, moves or adopts, and calls `app.relaunch()` + `app.exit(0)`. On failure it shows a native error and relaunches on whichever folder is now saved.
  - "Use default" picks for itself: it adopts the default folder if it still holds data, otherwise moves the data back into it.
  - Requests are trusted only from the app's own window and origin. In the dev shell the feature reports itself unavailable.

### Wiring
- `electron/main.cjs`:
  - `DATA_DIR()` returns the resolved folder, or the default before resolution and in the dev shell;
  - `resolveAtStartup` runs before the server starts, and Quit quits the app;
  - new `stopServerAndWait()`;
  - the three handlers are registered.
- `electron/preload.cjs` exposes `window.lh.dataFolder {get, choose, apply}`.
- `components/settings/data-folder-settings.tsx` is the Data folder row at the top of Settings → General:
  - the path, middle-truncated, with Choose… and Use default;
  - `planFor` produces the confirmation copy for each folder kind;
  - running turns, jobs or extractions (from `/api/chats` and `/api/activity`) block a switch;
  - a hint under the row covers one Mac at a time and Keep Downloaded.
- `settings-dialog.tsx` renders the row. The `window.lh` typing in `sidebar.tsx` gains `dataFolder`.

### Tests (21 new, all pass)
- `tests/data-location.test.ts` (6), `tests/data-folder.test.ts` (9) and `tests/render-data-folder-settings.test.tsx` (6).
- `tests/desktop-platform.test.ts` now pins the new preload member.
- The automatic-updates, desktop and settings render tests still pass. Typecheck and lint are clean.

### Docs
- `docs/architecture.md`: §8 and a "Fork data folder" seam row.
- `docs/fork-workflow.md`: the "Where your data lives" section.
- `.mem/structure.md`.

### Installed and in use
- Built and installed `477de68`.
- The user moved the data through the UI to `~/Library/Mobile Documents/com~apple~CloudDocs/LearnHarness`. Checked afterwards:
  - `data-location.json` holds that path;
  - the log shows the move, the save and the relaunch on the iCloud folder;
  - `settings.json` is byte-identical to the backup taken before the test;
  - the old Application Support `data/` is gone;
  - `chatgpt-credentials.json` stayed in Application Support, and the ChatGPT login survived.

## Decisions

- **Data goes directly in the chosen folder,** with no subfolder (user). The folder must be empty or already hold LearnHarness data.
- **On a move the old copy is deleted after a verified copy,** with no backup folder (user). The location is saved between the copy and the delete, so a failure at any point leaves usable data in the saved folder.
- **A missing folder at launch stops and asks,** never falls back (user).
- **Switching relaunches the whole app** (user), reusing the normal startup path, so the ChatGPT and subscription wiring comes back unchanged.
- **The Electron flow lives in fork-owned files** with injected dependencies, so the upstream files carry only a few lines each.

## Key Files Affected

- New: `electron/data-location.cjs`, `electron/data-folder.cjs`, `components/settings/data-folder-settings.tsx`, `tests/data-location.test.ts`, `tests/data-folder.test.ts`, `tests/render-data-folder-settings.test.tsx`.
- Changed: `electron/main.cjs`, `electron/preload.cjs`, `components/settings/settings-dialog.tsx`, `components/sidebar.tsx`, `tests/desktop-platform.test.ts`, `docs/architecture.md`, `docs/fork-workflow.md`, `.mem/structure.md`.
- Outside the repo:
  - `/Applications/LearnHarness.app` reinstalled;
  - user data now in `~/Library/Mobile Documents/com~apple~CloudDocs/LearnHarness`;
  - `~/Library/Application Support/LearnHarness/data-location.json`;
  - a pre-test backup in the session scratchpad.

## Notes

- Computer-use couldn't capture the native folder picker: "audio/video capture failure", because it runs out of process. The screen then locked, so the move was driven by the user rather than automated.
- Not exercised by hand in the installed app, only by tests: Use default, refusing a folder with other files, and the missing-folder startup dialog.
- `brctl` showed nothing for the folder, so whether it is set to Keep Downloaded was not checked.
