---
title: Resolve the data folder in main.cjs, with the missing-folder dialog
status: todo
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T15:52:42+02:00"
---

Spec section 2, startup half. DATA_DIR() resolves through readLocation(app.getPath('userData')); secrets/logs stay under userData. Before startServer in the packaged path: if the location is custom and classifyFolder says missing, or the location file is corrupt, show dialog.showMessageBoxSync naming the path with Try again / Choose another folder… / Quit. Choose another opens the folder picker, accepts only empty or learnharness folders, writes the location without moving, re-checks; other kinds explain and loop. The data dir log line shows the resolved folder.
