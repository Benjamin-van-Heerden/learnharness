---
title: Add architecture headings runnable and memory
status: completed
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:14:52+02:00"
completed_at: "2026-10-27T12:14:52+02:00"
---

Spec section 4, first two bullets. Create executable .mem/runnables/architecture that prints the ## and ### headings of docs/architecture.md with line numbers, then one line: read the sections a change touches and keep them current. Run mem memory set architecture with the wording in the spec. Verify with mem onboard --offline that both runnables print and the memory appears in AGENTS.md.

## Completion Notes

Added the executable onboard runnable .mem/runnables/architecture, which prints the ## and ### headings of docs/architecture.md with line numbers and a reminder to read and update the sections a change touches, and set the architecture project memory (docs/architecture.md describes this fork's code; update it in the same commit; reconcile upstream edits on merge). Verified: the runnable prints 27 headings, and mem onboard --offline shows both the architecture and upstream runnables in .mem/local/onboard.md, with the memory in AGENTS.md's memories section.
