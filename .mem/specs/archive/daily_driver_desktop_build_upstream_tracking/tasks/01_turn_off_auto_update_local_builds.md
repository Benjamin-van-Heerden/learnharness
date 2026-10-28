---
title: Turn off auto-update in local builds
status: completed
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:10:10+02:00"
completed_at: "2026-10-27T12:10:10+02:00"
---

Spec section 1. In electron/main.cjs setupAutoUpdater(), when require('../package.json').lhLocalBuild === true: log 'auto-update: local build — updater disabled', reportUpdateStatus('disabled') and return before requiring electron-updater. Extend tests/automatic-updates.test.ts (vm-loaded main.cjs with fake Electron/updater/fs; give the fixture a way to supply the packaged package.json) to assert: with the marker the updater module is never required, no check runs, status is disabled; without it, existing behaviour is unchanged. Run: NODE_ENV=test npx tsx --test tests/automatic-updates.test.ts.

## Completion Notes

Fork local builds skip the auto-updater: setupAutoUpdater() returns with status disabled when the packaged package.json carries lhLocalBuild: true, before electron-updater is required. tests/automatic-updates.test.ts covers the marked build (updater never required, no checks, no preference read, status disabled) and the unmarked packaged build (updater still loads); all 30 tests pass, typecheck clean.
