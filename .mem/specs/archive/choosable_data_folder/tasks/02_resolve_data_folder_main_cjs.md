---
title: Resolve the data folder in main.cjs, with the missing-folder dialog
status: completed
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T15:58:04+02:00"
completed_at: "2026-10-28T15:58:04+02:00"
---

Spec section 2, startup half. DATA_DIR() resolves through readLocation(app.getPath('userData')); secrets/logs stay under userData. Before startServer in the packaged path: if the location is custom and classifyFolder says missing, or the location file is corrupt, show dialog.showMessageBoxSync naming the path with Try again / Choose another folder… / Quit. Choose another opens the folder picker, accepts only empty or learnharness folders, writes the location without moving, re-checks; other kinds explain and loop. The data dir log line shows the resolved folder.

## Completion Notes

DATA_DIR() in electron/main.cjs now returns the folder resolved once per launch by resolveAtStartup (new electron/data-folder.cjs), falling back to <userData>/data before resolution and in the dev shell; auth.json, the ChatGPT/subscription stores and logs stay in userData. A custom folder that is missing, or a corrupt data-location.json, shows a native dialog before the server starts with Try Again / Choose Another Folder… / Quit; Choose accepts only empty or LearnHarness folders and saves them without moving, Quit quits. moveData now saves the location (beforeDelete hook) between the verified copy and deleting the source. data-folder.cjs also carries the IPC registration wired in the next task. Tests: tests/data-folder.test.ts (4: no dialog when fine, a missing folder asks and never falls back, Choose refuses other files and accepts empty, a corrupt setting asks) plus data-location (6), automatic-updates and desktop tests: 62 pass. Typecheck clean.
