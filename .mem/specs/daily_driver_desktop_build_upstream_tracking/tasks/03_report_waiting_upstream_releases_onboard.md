---
title: Report waiting upstream releases at onboard
status: todo
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:06:57+02:00"
---

Spec section 3. Extend .mem/runnables/upstream, keeping its existing sync and count. Add: git fetch -q upstream --tags; for each v* tag in origin/main but not dev (git tag --merged origin/main --no-merged dev, oldest first, previews included) print tag, date and release notes from gh release view <tag> --repo amosblomqvist/learnharness --json body (truncate past ~60 lines with a link). When dev..origin/main is non-empty, list changed files grouped into risk areas (package.json/package-lock.json; electron/ and electron-builder.yml; src/core/contracts/, src/store/, tests/fixtures/golden-data/; docs/architecture.md; AGENTS.md), each with a one-line reason. When anything is waiting, print an agent instruction: tell the user, summarise the notes, recommend review, merge only when asked; after merge npm install if the lockfile changed, typecheck, related tests, reconcile docs/architecture.md, remind to promote and run npm run desktop:local. Degrade gracefully without gh or network. Verify by running it now (nothing waiting) and against a simulated state, e.g. temporarily pointing the comparison at an older ref such as v0.3.6, without changing branches.
