---
title: Switch to single-branch mode and do the first real install
status: completed
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-28T13:52:03+02:00"
completed_at: "2026-10-28T13:52:03+02:00"
---

Approved by the user 2026-10-28 (replaces the earlier promote step). Switch .mem/config.toml to single_branch = true (drop staging and production), push, run mem onboard so AGENTS.md takes the single-branch rules, delete the test and release branches on origin and locally, point scripts/desktop-local.sh at origin/dev and rename its worktree to ../learnharness-build (git worktree move), and update docs/fork-workflow.md, .mem/structure.md, the upstream runnable's closing instruction, docs/architecture.md §8 and the spec. Then run npm run desktop:local, launch /Applications/LearnHarness.app, confirm a session opens, Settings → General shows no update controls, codesign -dv shows ad-hoc, data is under ~/Library/Application Support/LearnHarness/data, and a second npm run desktop:local reinstalls cleanly with data intact.

## Completion Notes

Switched to mem single-branch mode (single_branch = true, staging/production removed; mem onboard refreshed AGENTS.md to the single-branch variant and onboard no longer shows RELEASES), deleted test and release on origin and locally, pointed scripts/desktop-local.sh at origin/dev and moved its worktree to ../learnharness-build, and updated fork-workflow.md, structure.md, the upstream runnable, architecture §8 and the spec. First real install: npm run desktop:local built f6fabe4 and installed /Applications/LearnHarness.app; codesign shows Signature=adhoc and verifies; the app launched with data in ~/Library/Application Support/LearnHarness/data and logged 'auto-update: local build — updater disabled'; Settings → General shows only the version and release notes, no update controls. A second run quit the running app and reinstalled cleanly; the data folder was unchanged (it holds no files yet, since no models are set up and no session has run).
