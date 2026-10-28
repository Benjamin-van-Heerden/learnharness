---
title: Add the data-location module and tests
status: todo
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T15:52:42+02:00"
---

Spec section 1. Create electron/data-location.cjs (plain Node, no Electron imports): readLocation/writeLocation over <userData>/data-location.json (atomic temp+rename; absent = default <userData>/data; corrupt = error), classifyFolder (missing/empty incl. .DS_Store/.localized/Icon\r/learnharness via chats/ graph/ settings.json/other), copyVerified (recursive copy into empty dst, size+SHA-256 check per file, symlinks are an error, cleans dst and throws on failure, never touches src), moveData (copyVerified then rm src), equal/nested path guards. Write tests/data-location.test.ts covering the spec's Success Criteria list for this module, using temp dirs.
