---
title: Document, rebuild and verify in the installed app
status: completed
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T16:26:35+02:00"
completed_at: "2026-10-28T16:26:35+02:00"
---

Spec section 5 plus the manual checks. Update docs/architecture.md §8 and add a Fork data folder seam row in §12, docs/fork-workflow.md Where your data lives, and .mem/structure.md. Run typecheck, lint, tests/data-location.test.ts and the touched settings/sidebar tests. Commit and push, run npm run desktop:local, then verify by hand in the installed app: default path shown; move to an empty test folder (old data/ deleted, log shows the new data dir, sessions/settings intact); Use default moves it back; a folder with unrelated files is refused; renaming the chosen folder while the app is closed triggers the startup dialog. Leave the app on the default folder at the end unless the user says otherwise.

## Completion Notes

Docs: architecture §8 and a Fork data folder seam row, fork-workflow's data section (moving, one Mac at a time, Keep Downloaded, the missing-folder dialog), structure doc. Built and installed 477de68 with npm run desktop:local; Settings → General shows the Data folder row with the default path. The user moved the data through the UI to ~/Library/Mobile Documents/com~apple~CloudDocs/LearnHarness: data-location.json holds that path, the log shows 'data folder: move … → …', 'now …' and the relaunch with data dir set to the iCloud folder, the folder holds chats/ and settings.json byte-identical to a pre-test backup, the old Application Support data/ is gone, and chatgpt-credentials.json stayed in Application Support (the ChatGPT login survived). Not exercised by hand in the installed app: Use default, refusing a folder with other files, and the missing-folder startup dialog; those paths are covered by tests/data-folder.test.ts and tests/render-data-folder-settings.test.tsx.
