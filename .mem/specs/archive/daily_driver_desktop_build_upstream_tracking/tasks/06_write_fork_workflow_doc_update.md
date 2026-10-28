---
title: Write fork workflow doc and update structure doc
status: completed
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:23:29+02:00"
completed_at: "2026-10-27T12:23:29+02:00"
---

Spec section 5. Create docs/fork-workflow.md covering branches (main mirrors upstream, dev, release builds the daily app), first install via npm run desktop:local and adding keys in Settings, data location ~/Library/Application Support/LearnHarness/ (untouched by builds), the change → mem promote production → npm run desktop:local loop, upstream intake (onboard report, review, git merge --no-ff origin/main, post-merge checks, promote, rebuild), and that the app never self-updates. Update .mem/structure.md: add scripts/desktop-local.sh, desktop:local, both runnables, link docs/fork-workflow.md, remove the 'docs/architecture.md is stale in places' bullet.

## Completion Notes

Added docs/fork-workflow.md: the branch roles, first install with npm run desktop:local and adding keys in Settings → Providers, where the installed app keeps its data (~/Library/Application Support/LearnHarness/, never touched by rebuilds; why the repo's dev mode is not a daily driver), that local builds never self-update, the change → promote → rebuild loop, upstream intake (onboard report, review, merge, post-merge checks, reconciling architecture.md) and the Node 26 requirement. Updated .mem/structure.md: the overview points at fork-workflow.md and states that architecture.md is ours, the .mem/ entry lists both runnables, the entry points and workflows include desktop:local and the intake loop, and the stale-architecture bullet is replaced by the convention plus a note that docs/development.md is still stale. Checked the doc's claims against the code (the Providers settings label, the LearnHarness-dev profile for desktop:dev, the auto-update path).
