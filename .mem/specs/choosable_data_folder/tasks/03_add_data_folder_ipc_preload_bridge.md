---
title: Add the data-folder IPC and preload bridge
status: completed
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T15:59:25+02:00"
completed_at: "2026-10-28T15:59:25+02:00"
---

Spec sections 2 (IPC) and 3. ipcMain.handle lh:data-folder:get ({path,isDefault,defaultPath}), lh:data-folder:choose (showOpenDialog openDirectory+createDirectory; returns canceled or {path,kind} with kind from classifyFolder plus current/nested), lh:data-folder:apply ({path,mode:move|adopt} or {reset:true}): re-classify, killServer and wait for exit, moveData for move, writeLocation (null for reset), app.relaunch()+app.exit(0); any error before writing the location shows a native error dialog and relaunches on the old location. Same trustedAppWindows/trustedSender checks as existing handlers; unavailable in LH_DEV_URL mode. preload.cjs exposes window.lh.dataFolder = {get, choose, apply} and documents it in its header.

## Completion Notes

main.cjs registers lh:data-folder:get / :choose / :apply through registerDataFolderIPC (electron/data-folder.cjs), with the same trustedAppWindows + trustedSender check as the other handlers and available=false in the dev shell (get reports {available:false}, the others refuse). New stopServerAndWait() resolves once the server child has exited. Apply validates before touching the server (current/nested/unusable targets and mode mismatches are refused), then stops the server, moves (verified copy, save the choice, delete the source) or adopts, and relaunches; reset adopts a default that still holds data and moves into an empty or deleted one; a failed move shows a native error and relaunches on the old folder with its data intact. preload.cjs exposes window.lh.dataFolder {get, choose, apply}, documented in its header; tests/desktop-platform.test.ts pins the new member. tests/data-folder.test.ts gained 5 IPC tests (get/choose kinds, move order stop→copy→save→delete→relaunch, reset adopt vs move, refusals before any effect incl. untrusted and dev, failure rollback). 71 shell tests pass, typecheck and lint clean.
