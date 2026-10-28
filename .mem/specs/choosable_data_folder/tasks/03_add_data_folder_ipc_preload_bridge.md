---
title: Add the data-folder IPC and preload bridge
status: todo
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T15:52:42+02:00"
---

Spec sections 2 (IPC) and 3. ipcMain.handle lh:data-folder:get ({path,isDefault,defaultPath}), lh:data-folder:choose (showOpenDialog openDirectory+createDirectory; returns canceled or {path,kind} with kind from classifyFolder plus current/nested), lh:data-folder:apply ({path,mode:move|adopt} or {reset:true}): re-classify, killServer and wait for exit, moveData for move, writeLocation (null for reset), app.relaunch()+app.exit(0); any error before writing the location shows a native error dialog and relaunches on the old location. Same trustedAppWindows/trustedSender checks as existing handlers; unavailable in LH_DEV_URL mode. preload.cjs exposes window.lh.dataFolder = {get, choose, apply} and documents it in its header.
