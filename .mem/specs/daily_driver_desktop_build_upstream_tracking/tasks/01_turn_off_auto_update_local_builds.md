---
title: Turn off auto-update in local builds
status: todo
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:06:57+02:00"
---

Spec section 1. In electron/main.cjs setupAutoUpdater(), when require('../package.json').lhLocalBuild === true: log 'auto-update: local build — updater disabled', reportUpdateStatus('disabled') and return before requiring electron-updater. Extend tests/automatic-updates.test.ts (vm-loaded main.cjs with fake Electron/updater/fs; give the fixture a way to supply the packaged package.json) to assert: with the marker the updater module is never required, no check runs, status is disabled; without it, existing behaviour is unchanged. Run: NODE_ENV=test npx tsx --test tests/automatic-updates.test.ts.
