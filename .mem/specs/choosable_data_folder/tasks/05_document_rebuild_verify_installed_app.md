---
title: Document, rebuild and verify in the installed app
status: todo
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T15:52:42+02:00"
---

Spec section 5 plus the manual checks. Update docs/architecture.md §8 and add a Fork data folder seam row in §12, docs/fork-workflow.md Where your data lives, and .mem/structure.md. Run typecheck, lint, tests/data-location.test.ts and the touched settings/sidebar tests. Commit and push, run npm run desktop:local, then verify by hand in the installed app: default path shown; move to an empty test folder (old data/ deleted, log shows the new data dir, sessions/settings intact); Use default moves it back; a folder with unrelated files is refused; renaming the chosen folder while the app is closed triggers the startup dialog. Leave the app on the default folder at the end unless the user says otherwise.
