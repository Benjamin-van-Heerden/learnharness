---
title: Add the data-location module and tests
status: completed
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T15:55:42+02:00"
completed_at: "2026-10-28T15:55:42+02:00"
---

Spec section 1. Create electron/data-location.cjs (plain Node, no Electron imports): readLocation/writeLocation over <userData>/data-location.json (atomic temp+rename; absent = default <userData>/data; corrupt = error), classifyFolder (missing/empty incl. .DS_Store/.localized/Icon\r/learnharness via chats/ graph/ settings.json/other), copyVerified (recursive copy into empty dst, size+SHA-256 check per file, symlinks are an error, cleans dst and throws on failure, never touches src), moveData (copyVerified then rm src), equal/nested path guards. Write tests/data-location.test.ts covering the spec's Success Criteria list for this module, using temp dirs.

## Completion Notes

Added electron/data-location.cjs: readLocation/writeLocation over <userData>/data-location.json (atomic write; absent means the default <userData>/data; corrupt or relative is an error), classifyFolder (missing/empty with Finder clutter/learnharness via chats, graph or settings.json/other), checkPaths (equal and nested refused), copyVerified (recursive copy into an empty folder, size + SHA-256 per file, symlinks refused, cleans up and rethrows on failure, source untouched; copyFile injectable for tests) and moveData (verified copy, then delete the source). tests/data-location.test.ts: 6 tests pass (location default/round-trip/reset and corrupt cases, classification, a nested move, a corrupted copy rolled back with the source intact, refusals). electron/** is already in the packaged allow-list.
