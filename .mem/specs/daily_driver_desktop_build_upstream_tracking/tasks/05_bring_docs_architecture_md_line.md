---
title: Bring docs/architecture.md in line with the code
status: completed
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:22:33+02:00"
completed_at: "2026-10-27T12:22:33+02:00"
---

Spec section 4, drift list. Edit docs/architecture.md so it describes this fork's code as it is: practice as a chat kind (createPracticeAgent, problem/conclude, practice-dock/cards, no data/practice, chains.ts), native LhMessage records and the pi event SSE with reattach (no record-adapter/UIMessage/addToolOutput), the real turn sequence, no embedder, 32 route files, the six ports and real stores.ts wiring, Tavily/Brave search, the Electron IPC channels and proxy.ts, events table emitters, the tool surfaces (explain, recall, send_to_user, pdf) and prompt dirs (shared/, practice/), the linkedom render-test note. Verify each claim against the code while editing; every named path and function must exist. Keep the doc's structure and voice; do not touch docs/development.md.

## Completion Notes

Brought docs/architecture.md in line with the code, checking each claim against the source: practice is now a chat kind (createPracticeAgent, problem/conclude with the turn-scoped gate, graph-context picks via POST /api/chats and chainsForSelection, practice dock/cards and markers, no extraction) and section 7 is rewritten, with the chain table as the graph's management/selection surface; five systems instead of six; pi-native LhMessage records and the runPiTurn event wire replace record-adapter/UIMessage/addToolOutput, and the section 5 turn sequence follows handleChatInput; six ports and the real stores.ts wiring and adapter bypasses; createExtractionPipeline/createJobRunner signatures without the embedder; 32 route files; contracts as eight files; Tavily/Brave search; proxy.ts, the IPC channels and the auto-update path, including the fork's lhLocalBuild switch; the event table gains subscriptions-changed, record-changed and compaction-changed; testing, seam directory and decision history updated. Verified that every repo path the doc names exists (the only absent ones are runtime data files, the upcoming fork-workflow.md, and record-adapter.ts in the decision history) and that no stale terms remain.
