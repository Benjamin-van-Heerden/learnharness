# Fork workflow: build, use, change, take upstream in

This fork (`Benjamin-van-Heerden/learnharness`) is used daily as a desktop app on macOS, changed on its own branch, and kept in step with upstream (`amosblomqvist/learnharness`) by deliberate merges. Everything here is for this fork only; upstream's own build and release process is in [desktop-release.md](desktop-release.md).

## Branches

| Branch | Role |
|---|---|
| `main` | An exact mirror of upstream. Never committed to; the `upstream` onboard runnable fast-forwards it from upstream with `gh repo sync`. |
| `dev` | Development. Upstream comes in here by merge commit. |
| `test` | Staging (`mem promote staging`). |
| `release` | Production (`mem promote production`). The daily app is built from this branch. |

## First install

```bash
npm run desktop:local
```

`scripts/desktop-local.sh` builds `origin/release` in a worktree beside the repo (`../learnharness-release`) and installs `/Applications/LearnHarness.app`:

- The first run creates the worktree and runs `npm ci` there (about 1 GB). Later runs reinstall dependencies only when `package-lock.json` changes.
- It runs the same gates as `desktop:dist` (`next build`, the provider-runtime smoke, `build-server.mjs`, the server smoke under Electron's Node), then packages the `.app` with an ad-hoc signature and no notarization.
- If LearnHarness is running, the script quits it first. Any failed step stops before the installed app is touched.

Open the app and add your API keys (or connect a subscription) in Settings → Providers, then pick models in the setup flow.

## Where your data lives

The installed app keeps everything in `~/Library/Application Support/LearnHarness/`: `data/` (sessions, graph ledgers, jobs, settings), `auth.json` (keys, mode 0600) and `logs/main.log`. Rebuilding and reinstalling never touches it.

Don't use `npm run dev` from the repo as a daily driver: in dev/web mode the app uses the repo's `data/`, which the test suite also writes to.

## The app never updates itself

Local builds carry `lhLocalBuild: true` in their packaged `package.json`, so the auto-updater is never loaded and Settings → General shows no update controls ([architecture §8](architecture.md#8-process-boundaries-the-machine-room)). Upstream's update feed would otherwise replace this build with upstream's. The app changes only when you rebuild.

## Making a change

1. Work on `dev` (commit as usual; `mem sync` pushes).
2. Try it: `npm run dev` for the web app, or `npm run desktop:dev` for the desktop shell against the dev server. Both run beside the installed app; the dev shell uses its own `LearnHarness-dev` profile.
3. When it's ready for daily use: `mem promote production` (optionally `mem promote staging` first).
4. Rebuild: `npm run desktop:local`.

## Taking upstream in

Upstream releases roughly daily. Every `mem onboard` runs the `upstream` runnable, which reports:

- how many upstream commits `dev` hasn't merged;
- each upstream release `dev` hasn't merged, with its release notes;
- the changed files in risk areas: dependencies, the desktop shell, on-disk formats, `docs/architecture.md`, `AGENTS.md`.

Review what's waiting before merging, especially anything that touches code this fork has changed. To take it in:

```bash
git fetch origin && git merge --no-ff origin/main
```

Then:

1. Run `npm install` if `package-lock.json` changed.
2. Run `npm run typecheck` and the tests related to the changed areas.
3. Reconcile `docs/architecture.md`: it describes this fork's code, so neither side's version wins wholesale.
4. Push `dev`, promote, and run `npm run desktop:local`.

Never rebase `dev` or force-push it, and never push to `upstream` (its push URL is disabled).

## Node

Use Node 26, the version upstream's CI uses. On Node 22 the subscription SDK loader (`electron/subscriptions.cjs`) fails.
