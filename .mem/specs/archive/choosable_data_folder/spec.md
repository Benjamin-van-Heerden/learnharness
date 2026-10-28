---
title: Choosable data folder
status: completed
assigned_to: benjamin_van_heerden
created_at: "2026-10-28T15:51:13+02:00"
updated_at: "2026-10-28T16:26:40+02:00"
completed_at: "2026-10-28T16:26:40+02:00"
---

## Overview

The desktop app always keeps its data in `~/Library/Application Support/LearnHarness/data`: `electron/main.cjs` `DATA_DIR()` hard-codes it and passes it to the server as `LH_DATA_DIR`. The user wants to choose the folder, for example in iCloud Drive, because the sessions and the knowledge graph are the valuable part.

This adds a **Data folder** row to Settings → General. It shows the current folder and has a **Choose…** button that opens the native folder picker. LearnHarness then either moves the existing data into the chosen folder or adopts data already there, and relaunches. Secrets and logs stay in Application Support.

This is fork-only work. Keep the edits to upstream files small (a few lines each), so upstream merges stay easy.

## Goals

- The user can pick any folder as the data folder from Settings → General, and switch back to the default.
- Existing data moves safely: copy, verify every file, then delete the old copy. Data is never silently written to a second place.
- A missing folder at launch stops the app and asks the user, never falls back.
- Secrets never leave Application Support: `auth.json`, `chatgpt-credentials.json`, the subscription credential files, and `logs/`.

## User decisions (2026-10-28)

1. **The data lives directly in the chosen folder** (`chats/`, `graph/`, `settings.json` and so on), not in a subfolder. The folder must therefore be empty or already hold LearnHarness data.
2. **On a move, the old copy is deleted after a verified copy.** There is no backup folder.
3. **If the chosen folder is missing at launch**, the app shows a native dialog before the server starts: **Try again**, **Choose another folder…** or **Quit**. It never falls back to the default.
4. **Switching relaunches the whole app** (`app.relaunch()` + `app.exit(0)`), using the normal startup path. The server is not restarted in place.

## Technical Approach

### 1. `electron/data-location.cjs` (new, fork-owned, plain Node with no Electron imports, unit-tested)

- **Location file:** `<userData>/data-location.json` = `{ "dataDir": "<absolute path>" }`.
  - With no file, or with `dataDir` absent, the location is the default `<userData>/data`.
  - Writes are atomic: write a temp file, then rename.
  - An unreadable or corrupt file is treated as an error that the startup dialog shows. It never silently means the default.
- **`readLocation(userData)`** returns `{ dataDir, isDefault }`. **`writeLocation(userData, dirOrNull)`** saves the path; `null` removes the file, which means the default.
- **`classifyFolder(dir)`** returns one of:
  - `"missing"`: the path doesn't exist or isn't a directory.
  - `"empty"`: it holds nothing, or only Finder clutter (`.DS_Store`, `.localized`, `Icon\r`).
  - `"learnharness"`: it holds at least one of `chats/`, `graph/` or `settings.json`.
  - `"other"`: it holds anything else.
- **`copyVerified(src, dst)`:**
  - Recursively copies every regular file and directory from `src` into the empty `dst`.
  - Then checks each copied file against its source: same size and same SHA-256.
  - Symlinks and other non-regular entries in `src` are an error, not a silent skip.
  - On any failure it removes what it created in `dst` and throws. `src` is never touched.
- **`moveData(src, dst)`:** `copyVerified`, then `fs.rmSync(src, { recursive: true })`.
- **Path guards:** refuse when `dst` equals `src`, or when either is inside the other.

### 2. `electron/main.cjs`

- `DATA_DIR()` returns `readLocation(app.getPath("userData")).dataDir`. `AUTH_FILE`, the ChatGPT and subscription stores, and `logs/` keep using `userData`.
- **Startup, in the packaged path before `startServer`:** when the location is not the default and `classifyFolder` says `"missing"`, or the location file is corrupt, show `dialog.showMessageBoxSync` naming the path, with three buttons:
  - **Try again** re-checks.
  - **Choose another folder…** opens the folder picker. It accepts only `"empty"` or `"learnharness"` folders and switches the location to that folder with no move, since the old folder isn't there. Any other kind explains why and shows the dialog again.
  - **Quit** calls `app.quit()`.
  
  The default location is created as today when missing.
- **IPC handlers**, with the same `trustedAppWindows` and `trustedSender` checks as the existing ones. In dev mode (`LH_DEV_URL`) they report that the feature is unavailable.
  - `lh:data-folder:get` returns `{ path, isDefault, defaultPath }`.
  - `lh:data-folder:choose` opens `dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] })` and returns `{ canceled }` or `{ path, kind }`. `kind` comes from `classifyFolder`, plus `"current"` when the path is the current folder and `"nested"` when the path guard refuses it.
  - `lh:data-folder:apply` takes `{ path, mode: "move" | "adopt" }`, or `{ reset: true }` to go back to the default.
    - It re-classifies the target. Move needs `"empty"`, adopt needs `"learnharness"`, and `reset` picks move or adopt the same way for the default folder.
    - It calls `killServer()` and waits for the child to exit (up to the existing 3-second SIGKILL fallback).
    - For a move, it runs `moveData(currentDir, target)`.
    - It writes the location (`null` for reset) and calls `app.relaunch()` + `app.exit(0)`.
    - On any error before the location is written, it shows a native error dialog with the message, then relaunches on the unchanged old location. The data is untouched there, because `copyVerified` never modifies its source.
- The existing `data dir:` startup log line now shows the resolved folder.

### 3. `electron/preload.cjs`

Adds `window.lh.dataFolder = { get, choose, apply }` over the three channels, and documents it in the header comment like the other members.

### 4. Settings → General (`components/settings/data-folder-settings.tsx`, new)

- Renders nothing unless `window.lh?.dataFolder` exists (browser and dev builds).
- **A "Data folder" row:**
  - the current path, middle-truncated, with the full path in a `title`;
  - a **Choose…** button;
  - a **Use default** button when the folder isn't the default.
- **After choosing**, an inline confirmation:
  - `empty`: "Move your data to <path>? LearnHarness copies everything, checks it, deletes the old copy, and restarts." with the button **Move and restart**.
  - `learnharness`: "This folder already has LearnHarness data. Switch to it? Your current data stays where it is." with **Switch and restart**.
  - `other`: "This folder has other files in it. Choose an empty folder, or one that already holds LearnHarness data." No action.
  - `current`: no change. `nested`: "Choose a folder outside your current data folder."
  - **Use default** shows the same move or switch confirmation for the default folder.
- **Busy guard:** before applying, fetch `/api/chats` (any `busy`) and `/api/activity` (any `jobs` or `extractions`). If anything is running, show "Wait for running sessions and background work to finish." and don't apply.
- **A hint under the row:** "Use this folder on one Mac at a time. In iCloud Drive, set the folder to Keep Downloaded."
- `components/settings/settings-dialog.tsx` renders `<DataFolderSettings />` in the General section, above `UpdateSettings`.
- The `window.lh` typing in `components/sidebar.tsx` (`declare global`) gains the `dataFolder` member.

### 5. Docs

- `docs/architecture.md`:
  - §8: the data-dir seam now resolves through `data-location.json`;
  - §12: a new "Fork data folder" seam row.
- `docs/fork-workflow.md`, "Where your data lives": the setting, the one-Mac-at-a-time and Keep Downloaded advice, and which files stay in Application Support.
- `.mem/structure.md`: the new module, IPC channels and component.

## Success Criteria

- `tests/data-location.test.ts` covers:
  - `classifyFolder` for all four kinds, including Finder clutter counting as empty;
  - `readLocation` and `writeLocation` (the default when the file is absent, round-trip, reset, a corrupt file reported as an error);
  - `copyVerified` copying a nested tree, and refusing symlinks;
  - a verification failure leaving the source intact and the destination cleaned up;
  - `moveData` deleting the source only after a successful verification;
  - the equal and nested path guards.
- `DATA_DIR()` in `electron/main.cjs` resolves through `readLocation`. `auth.json`, `chatgpt-credentials.json`, the subscription files and `logs/` still resolve under `userData`.
- In the installed app (`npm run desktop:local`), these are verified by hand:
  - Settings → General shows "Data folder" with the default path.
  - Choosing an empty test folder moves the data, deletes the old `data/`, relaunches, and the log shows `data dir: <test folder>`, with sessions and settings intact.
  - **Use default** moves it back.
  - Choosing a folder with unrelated files is refused.
  - Renaming the chosen folder while the app is closed makes the next launch show the Try again / Choose another / Quit dialog.
- The row is absent in browser mode.
- `npm run typecheck` and `npm run lint` are clean, the new tests pass, and the touched upstream tests still pass.

## Notes

- The server is unchanged. It already reads `LH_DATA_DIR` (`config.ts`).
- The busy guard runs in the renderer and is best effort. `apply` stops the server before touching files, so a race costs at most an interrupted turn, never torn data.
- Two Macs writing to one iCloud folder at once is unsupported. The append-only ledgers and whole-record rewrites can produce iCloud conflict copies. The UI hint and the docs say so.
- Adopting a folder leaves the previous data where it was, by design (decision 2 covers moves only).
