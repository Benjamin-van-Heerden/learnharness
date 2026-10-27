---
title: Promote and do the first real install
status: todo
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:06:57+02:00"
---

Stop and ask the user to approve a production release (mem promote production), since releases only happen at the user's request. After they approve: promote, run npm run desktop:local, launch /Applications/LearnHarness.app, confirm a session opens, Settings → General shows no update controls, codesign -dv shows ad-hoc, data is under ~/Library/Application Support/LearnHarness/data. Then make a trivial visible change only if the user wants a rebuild test; otherwise confirm a second npm run desktop:local reinstalls cleanly with data intact.
