---
title: Switch to single-branch mode and do the first real install
status: todo
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:06:57+02:00"
---

Approved by the user 2026-10-28 (replaces the earlier promote step). Switch .mem/config.toml to single_branch = true (drop staging and production), push, run mem onboard so AGENTS.md takes the single-branch rules, delete the test and release branches on origin and locally, point scripts/desktop-local.sh at origin/dev and rename its worktree to ../learnharness-build (git worktree move), and update docs/fork-workflow.md, .mem/structure.md, the upstream runnable's closing instruction, docs/architecture.md §8 and the spec. Then run npm run desktop:local, launch /Applications/LearnHarness.app, confirm a session opens, Settings → General shows no update controls, codesign -dv shows ad-hoc, data is under ~/Library/Application Support/LearnHarness/data, and a second npm run desktop:local reinstalls cleanly with data intact.
