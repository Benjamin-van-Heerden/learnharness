---
title: Auto-titles via a titler role on the cheap slot
status: completed
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:44:47+02:00"
completed_at: "2026-10-29T13:44:47+02:00"
---

Spec §5. Add titler to ModelRole (config.ts) and BACKGROUND_MODEL_ROLES, with ROLE_SLOT.titler = cheap, labelled 'Session titles' in Agent settings, and update the tests that pin the role set. Add titleSource ('prompt'|'model'|'user', absent = prompt) to the chat record; the rename route writes 'user'. A new src/server/session-title.ts resolves the titler engine (role override, then cheap slot), runs one tool-less call modelled on src/server/compaction.ts, sanitizes the reply into a 3-6 word sentence-case phrase within titleFromPrompt's cap, and writes it only while titleSource is still 'prompt', then emits chats-changed and record-changed. POST /api/chats fires it and forgets it with the full prompt; skip Untitled and practice sessions. Failures leave the prompt title silently. Tests: a fake engine sets the title; a rename beats a late model title; no cheap model means no throw and no change.

## Completion Notes

A new titler background role (ModelRole, BACKGROUND_MODEL_ROLES, ROLE_SLOT cheap) names sessions. src/server/session-title.ts runs one tool-less subagent call on the opening prompt (capped at 4,000 chars) and sanitizes the reply to a one-line phrase within the title cap. It writes only while the chat's new titleSource is still prompt, via renameChat(id, title, 'model'), which emits chats-changed; it also emits a new chat-titled event that the open chat header listens for (record-changed is ignored mid-turn). Hand renames write titleSource 'user' and always win. chat-handler's titleSessionInBackground resolves the role (role override, then cheap slot) and skips silently with no model, no key or no background consent; POST /api/chats fires it after creating, for teach and practice sessions alike. The Cheap slot's roster hint now mentions naming sessions (Agent settings has no per-role rows; user ruling). Usage of the title call is not recorded. Verified: typecheck and lint clean; new tests/session-title.test.ts (6) covers the sanitizer, a model title landing, a rename beating a late title, failures keeping the prompt title, and POST with no cheap model; settings, chat-flow, store-event, catalog and role tests pass (228).
