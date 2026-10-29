---
title: Auto-titles via a titler role on the cheap slot
status: todo
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:29:01+02:00"
---

Spec §5. Add titler to ModelRole (config.ts) and BACKGROUND_MODEL_ROLES, with ROLE_SLOT.titler = cheap, labelled 'Session titles' in Agent settings, and update the tests that pin the role set. Add titleSource ('prompt'|'model'|'user', absent = prompt) to the chat record; the rename route writes 'user'. A new src/server/session-title.ts resolves the titler engine (role override, then cheap slot), runs one tool-less call modelled on src/server/compaction.ts, sanitizes the reply into a 3-6 word sentence-case phrase within titleFromPrompt's cap, and writes it only while titleSource is still 'prompt', then emits chats-changed and record-changed. POST /api/chats fires it and forgets it with the full prompt; skip Untitled and practice sessions. Failures leave the prompt title silently. Tests: a fake engine sets the title; a rename beats a late model title; no cheap model means no throw and no change.
