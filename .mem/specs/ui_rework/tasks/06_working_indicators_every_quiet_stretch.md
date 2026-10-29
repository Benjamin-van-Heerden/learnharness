---
title: Working indicators for every quiet stretch
status: completed
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:50:06+02:00"
completed_at: "2026-10-29T13:50:06+02:00"
---

Spec §6. First reproduce each gap against a real stream (a ChatGPT session, or a recorded provider stream under debug/). (1) Between steps: show a 'Working…' spinner + shimmer line in the THINKING… register whenever the turn runs and the last part is neither streaming nor a live tool card, mutually exclusive with the THINKING… and compaction lines. (2) Hidden reasoning: an empty streaming reasoning part shows an animated 'Thinking · Ns' trigger, then 'Thought for Ns'; extend ReasoningTrigger's existing duration handling. (3) Tools running: keep executing tool cards (input-available, job dispatch, provider-side tools) animated with an elapsed timer until output. Render tests for (1) and (2), plus a check in the dev app.

## Completion Notes

Traced the stream path (session-core applyWireEvent, view.ts toolPartOf): executing tool calls already render the animated live card (input-streaming lasts until tool_execution_end), and an empty streaming message already projects the animated thinking row. The real silent stretch is after a tool settles or a message ends and before the next message_start. Added messageStreaming to the session state (the slot is now cleared before message_end's notify so that snapshot is correct) and components/working-line.ts, and chat.tsx shows a WORKING… spinner + shimmer line exactly then, never alongside THINKING… or compaction. A useElapsedSeconds hook adds a live seconds tick to the streaming thinking row and to live tool cards; a finished thinking row keeps upstream's static label (user ruling). No live provider stream was available to reproduce against. Verified: typecheck and lint clean; session-core tests (92) include a real tool step asserting the line at each phase; new render-working-indicators tests check both ticks with mocked timers; live-tool-card, streaming, cards and thinking tests pass.
