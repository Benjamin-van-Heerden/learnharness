---
title: Add the Data folder row to Settings → General
status: completed
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T16:01:26+02:00"
completed_at: "2026-10-28T16:01:26+02:00"
---

Spec section 4. New components/settings/data-folder-settings.tsx: hidden without window.lh?.dataFolder; row with middle-truncated current path (full path in title), Choose… and (when not default) Use default; inline confirmations per kind with the exact copy from the spec (empty → Move and restart, learnharness → Switch and restart, other/nested refusals, current no-op); busy guard via /api/chats busy flags and /api/activity jobs/extractions; the one-Mac/Keep Downloaded hint. Render it in settings-dialog.tsx's General section above UpdateSettings, and add dataFolder to the window.lh typing in components/sidebar.tsx. Keep upstream-file edits to a few lines.

## Completion Notes

New components/settings/data-folder-settings.tsx: renders nothing without window.lh.dataFolder or when the bridge reports unavailable (dev shell); a Data folder row with the middle-truncated path (full path in title), Choose… and, away from the default, Use default; planFor maps a folder kind to the spec's copy (empty → Move and restart, learnharness → Switch and restart, other/nested refused with no action, current no change; Use default uses defaultKind from get(), which data-folder.cjs now reports); the busy guard checks /api/chats busy flags and /api/activity jobs/extractions before apply; the one-Mac/Keep Downloaded hint under the path. settings-dialog.tsx renders it at the top of General; sidebar.tsx's window.lh typing gains dataFolder. tests/render-data-folder-settings.test.tsx (6: planFor per kind incl. reset, truncation, hidden without bridge/dev, confirmed move applies, Use default + refusal, busy work blocks apply); settings and update render tests still pass (48 total); typecheck and lint clean.
