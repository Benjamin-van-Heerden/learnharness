---
title: Bring docs/architecture.md in line with the code
status: todo
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:06:57+02:00"
---

Spec section 4, drift list. Edit docs/architecture.md so it describes this fork's code as it is: practice as a chat kind (createPracticeAgent, problem/conclude, practice-dock/cards, no data/practice, chains.ts), native LhMessage records and the pi event SSE with reattach (no record-adapter/UIMessage/addToolOutput), the real turn sequence, no embedder, 32 route files, the six ports and real stores.ts wiring, Tavily/Brave search, the Electron IPC channels and proxy.ts, events table emitters, the tool surfaces (explain, recall, send_to_user, pdf) and prompt dirs (shared/, practice/), the linkedom render-test note. Verify each claim against the code while editing; every named path and function must exist. Keep the doc's structure and voice; do not touch docs/development.md.
