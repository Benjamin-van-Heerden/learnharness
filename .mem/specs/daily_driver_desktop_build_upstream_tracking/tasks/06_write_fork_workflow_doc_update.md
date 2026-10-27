---
title: Write fork workflow doc and update structure doc
status: todo
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:06:57+02:00"
---

Spec section 5. Create docs/fork-workflow.md covering branches (main mirrors upstream, dev, release builds the daily app), first install via npm run desktop:local and adding keys in Settings, data location ~/Library/Application Support/LearnHarness/ (untouched by builds), the change → mem promote production → npm run desktop:local loop, upstream intake (onboard report, review, git merge --no-ff origin/main, post-merge checks, promote, rebuild), and that the app never self-updates. Update .mem/structure.md: add scripts/desktop-local.sh, desktop:local, both runnables, link docs/fork-workflow.md, remove the 'docs/architecture.md is stale in places' bullet.
