---
title: Add the Data folder row to Settings → General
status: todo
created_at: "2026-10-28T15:52:42+02:00"
updated_at: "2026-10-28T15:52:42+02:00"
---

Spec section 4. New components/settings/data-folder-settings.tsx: hidden without window.lh?.dataFolder; row with middle-truncated current path (full path in title), Choose… and (when not default) Use default; inline confirmations per kind with the exact copy from the spec (empty → Move and restart, learnharness → Switch and restart, other/nested refusals, current no-op); busy guard via /api/chats busy flags and /api/activity jobs/extractions; the one-Mac/Keep Downloaded hint. Render it in settings-dialog.tsx's General section above UpdateSettings, and add dataFolder to the window.lh typing in components/sidebar.tsx. Keep upstream-file edits to a few lines.
