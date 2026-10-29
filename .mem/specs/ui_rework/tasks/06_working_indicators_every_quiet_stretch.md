---
title: Working indicators for every quiet stretch
status: todo
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:29:01+02:00"
---

Spec §6. First reproduce each gap against a real stream (a ChatGPT session, or a recorded provider stream under debug/). (1) Between steps: show a 'Working…' spinner + shimmer line in the THINKING… register whenever the turn runs and the last part is neither streaming nor a live tool card, mutually exclusive with the THINKING… and compaction lines. (2) Hidden reasoning: an empty streaming reasoning part shows an animated 'Thinking · Ns' trigger, then 'Thought for Ns'; extend ReasoningTrigger's existing duration handling. (3) Tools running: keep executing tool cards (input-available, job dispatch, provider-side tools) animated with an elapsed timer until output. Render tests for (1) and (2), plus a check in the dev app.
