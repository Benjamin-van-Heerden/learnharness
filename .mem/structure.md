# Codebase and Structure

## Overview
LearnHarness is a learning app: a Next.js 16 (App Router) server and React UI, also packaged as an Electron desktop app. A teacher agent runs lessons as chat sessions. The first turns probe the learner (prober agent); after `probe_done` the teacher agent plans with `plan_init` and teaches with quiz/explain questions. Practice sessions run a separate practice agent. Teaching transcripts are extracted into a persistent knowledge graph of propositions and reasoning chains, which is the home page.

This repository is a personal fork of `amosblomqvist/learnharness` (AGPL-3.0-only). `main` mirrors upstream exactly and `dev` is the only working branch: mem runs in single-branch mode (`.mem/config.toml`, `single_branch = true`, `base = 'main'`), so there are no staging or production branches and nothing is promoted or tagged. The daily desktop app is built from the pushed `dev`. The build, change and upstream-intake loop is in `docs/fork-workflow.md`; `docs/architecture.md` is the canonical architecture spec and describes this fork's code.

## Tech Stack
- TypeScript (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`), ES modules (`"type": "module"`); Electron main process files are CommonJS (`electron/*.cjs`).
- Node 26 (the version CI uses, `.github/workflows/ci.yml`). The subscription SDK loader in `electron/subscriptions.cjs` fails on Node 22 (`ERR_PACKAGE_PATH_NOT_EXPORTED` for `@earendil-works/pi-ai`).
- Next.js 16 (`output: "standalone"`), React 19, Tailwind CSS 4, Radix UI, shadcn-style `components/ui/`.
- LLM engine: `@earendil-works/pi-ai` and `@earendil-works/pi-agent-core` (kept as `serverExternalPackages`). Models are BYOK slots in settings, providers via API keys or subscription connections (ChatGPT, GitHub Copilot, xAI/Grok).
- Validation: zod, typebox. Rendering: streamdown (markdown, math, mermaid, code), KaTeX, mermaid, d3-force/d3-zoom (graph layout and camera), hand-written Canvas 2D graph renderer.
- Native/headless: pdfjs-dist + `@napi-rs/canvas` (PDF rendering), `@resvg/resvg-js` (SVG rasterizing), puppeteer-core (Electron browser service or system Chrome for demo verification).
- Storage: plain JSON and append-only JSONL files under `data/`; no database.
- Electron 44 + electron-builder + electron-updater for desktop builds.
- Tests: `node:test` via `tsx`; Python `unittest` for the bundled skill.

## Directory Layout
```
app/                 Next.js pages and API route handlers (transport only)
  api/**/route.ts    32 route files (see External Interfaces)
  page.tsx           home (graph view, setup gate)
  chat/[id]/         a session; chat/new/ is the unsaved draft view (?mode=practice)
  settings/          redirects to /chat/new (settings is a dialog)
components/          React UI: session view, docks, graph canvas/view, chain table,
                     sidebar, settings dialog (settings/), artifact renderers (artifacts/),
                     ai-elements/, ui/ primitives
src/
  core/              pure domain logic and contracts; no IO (see Key Modules)
    contracts/       one file per domain: chat, chatgpt, graph, jobs, models, plan, probe, subscriptions
    ports.ts         storage port types
    index.ts         the browser-safe core barrel
  agent/             LLM agents, tools, prompts, sub-agents, extraction pipeline
    prompts/         prompt fragments: shared/, prober/, teacher/, practice/ (+ system-prompt.md)
    tools/           tool definitions for the agents
    subagents/       background workers, job runner, extraction pipeline
  server/            composition roots, service seams, the server barrel index.ts
    pi/              pi turn streaming (ui-stream.ts) and tool-call id handling (call-ids.ts)
  store/             fs adapters; the only modules that read/write data/
electron/            desktop main process, preload, subscription/ChatGPT owners and IPC
scripts/             build/packaging guards, smoke tests, one-shot data scripts
skills/learnharness/ standalone Python skill for reading a user's LearnHarness data
tests/               flat test directory; fixtures/ holds golden data, PDFs, tool-rendering JSON
docs/                design docs: architecture.md (ours), fork-workflow.md (ours), development.md, vision.md, ...
lib/utils.ts         cn() only (clsx + tailwind-merge)
config.ts            path constants and model-role types (repo root)
proxy.ts             Next 16 proxy guarding /api/* in desktop mode
public/              fonts, audio worklet (pcm-capture.js)
build/               desktop icons
data/                runtime state, git-ignored (relocated by LH_DATA_DIR)
.mem/                mem config, specs, this doc; runnables/ run at onboard:
                     upstream (waiting upstream releases + risk areas),
                     architecture (outline of docs/architecture.md)
```
Generated or local, never committed: `node_modules/`, `.next/`, `dist/`, `data/`, `.fresh-data/`, `auth.json`, `*-credentials.json*`, `.env.local`.

## Key Modules

### Core (`src/core`)
Pure logic; storage arrives as parameters.
- `contracts/*.ts` (barrel `contracts.ts`): shared types and zod schemas. `contracts/chat.ts` defines `ChatKind = "teach" | "practice"` and session records; `contracts/jobs.ts` the job/steer protocol; `contracts/graph.ts` ledger lines and snapshots; `contracts/plan.ts` plan trees and derived statuses.
- `ports.ts`: `ChatStore`, `GraphStore`, `JobStore`, `SettingsStore`, `PromptOverrideStore`, `AuthStore`.
- `native-messages.ts`: the persisted message format. Records store pi-native `LhMessage` (user/assistant/toolResult plus `LhMarkerMessage`, role `custom`, for steers and markers); `asAgentMessages` replays a record to the engine. Also `hasProbeDone`, `activeProblemOf`, `danglingQuestionOf`.
- `input-events.ts`: `parseChatInput` for `POST /api/chat` bodies.
- `graph.ts`: `mergeFindings` (the merger), `simplifyChains`, `deriveView`; `coverage.ts`: per-message extraction coverage fingerprints (both use `node:crypto`, so not in the barrel).
- `chains.ts` (`chainsForSelection`), `session-clusters.ts` (`birthSessionPartition`), `clusters.ts`, `layout.ts` / `layout-settle.ts`, `graph-deletion.ts`.
- `question-core.ts` (question parsing, seeded shuffle, grading), `plan-tree.ts`, `plan-blocks.ts`, `phases.ts`, `pending.ts`, `compaction.ts`, `context-usage.ts`, `prices.ts`, `cost-summary.ts`, `settings.ts` (`FACTORY_SETTINGS`), `settings-resolution.ts`, `session-markdown.ts`, `events.ts` (the push-event bus), `fuzzy.ts`, `search.ts`, `keyboard.ts`.

### Store (`src/store`)
| File | Export | Persists |
|---|---|---|
| `chats.ts` | `chatStore` | `data/chats/<id>.json`, one record per session |
| `graph.ts` | `graphStore` | `data/graph/{nodes,chains,sessions,coverage}.jsonl`, `sources.json`, `positions.json` |
| `graph-format.ts` | `assertGraphFormat`, `ensureGraphFormat` | `data/graph/format.json` version stamp |
| `jobs.ts` | `jobStore` | `data/jobs/<id>.json` (path built from `PATHS.data`); emits `jobs-changed` |
| `settings.ts` | `settingsStore` | `data/settings.json` |
| `render-settings.ts` | `readRenderSettings`, `writeRenderSettings` | `data/graph/render-settings.json` (no port) |
| `prompt-overrides.ts` | `promptOverrides` | `data/prompts/` override files |
| `auth.ts` | `authStore` | `auth.json` (`LH_AUTH_FILE` or repo root), mode 0600 |

Paths come from `config.ts` (`PATHS`, `LEDGER_FILES`, `SOURCES_FILE`, `POSITIONS_FILE`, `RENDER_SETTINGS_FILE`, `GRAPH_FORMAT_FILE`, `SETTINGS_FILE`, `PROMPTS_OVERRIDE_DIR`, `AUTH_FILE`). `config.ts` also defines `ModelRole` and `ThinkingLevel`.

### Server (`src/server`)
- `index.ts`: the server barrel, the only server import `app/` may use.
- `stores.ts`: storage composition root; wires `{chatStore, graphStore, jobStore, settingsStore}` and exports `effectiveSettings()`. `keys.ts`, `model-catalog.ts`, `observability.ts` and the barrel also import adapters directly.
- `chat-handler.ts`: turn composition root, `handleChatRequest(req, buildAgent?)` → `handleChatInput`. Chooses the agent: `createPracticeAgent` when `record.kind === "practice"`, else `createTeacherAgent` once `hasProbeDone`, else `createProberAgent`.
- `turn-service.ts` (`persistTurn`, `triggerExtraction`), `turn-liveness.ts` (`beginTurn`/`endTurn`/`isTurnRunning`, one turn per chat), `turn-runs.ts` (chatId → running turn handle; `abortTurn`, reattach), `pi/ui-stream.ts` (`runPiTurn`, `piTurnResponse`: streams pi agent events as SSE).
- `compaction.ts`: `ensureCompacted`, `kickCompaction` (context summarizing via a sub-agent).
- `jobs.ts`: steer delivery of background job results back into sessions (`deliverJobResult`, `setTurnRunner`, `registerLiveAgent`, `steerLiveChat`, `recoverStaleJobs`, `abortJob`).
- `dismissal-park.ts`: ESC dismissal of an open question or problem (`applyParkedDismissal`).
- `events-stream.ts`: the `GET /api/events` SSE seam over `core/events.ts`.
- `observability.ts`: the activity feed (running jobs, extraction, turns) and aborts.
- `graph.ts`, `commit-positions.ts`, `chats.ts`, `keys.ts`, `search.ts` (Tavily/Brave status), `model-catalog.ts`, `pricing.ts`, `settings-body.ts`, `desktop-access.ts`.
- `web-subscriptions.ts` / `web-subscription-http.ts`: web/dev owner of subscription credentials (imports `electron/*.cjs` controllers directly) and its same-origin HTTP controls.

### Agent (`src/agent`)
Dependencies arrive by factory arguments; never imports `server` or `store`.
- `teacher-agent.ts`: `createProberAgent`, `createTeacherAgent`, `createPracticeAgent`; adds `send_to_user` only for Claude model ids.
- `models.ts`: `piEngineFor(role)`, `piEngineForSpec`, `PiEngine`; resolves engines from the settings model slots (strong/cheap/vision) and per-role/per-chat overrides; 503 `models_not_configured` when empty.
- `prompt-segments.ts`: `composeInstructions(kind)` from `prompts/` plus user overrides.
- `tools.ts`: `createTeacherTools` (quiz/explain, ask_user_question, read/ls/find/grep, plan_init, research/demo/visual/pdf) and `createProberTools` (probe/recall, ask_user_question, fs tools, research/pdf, gated list_sessions/list_propositions, probe_done). Question tools have no server execute; the browser answers them.
- `tools/`: `plan.ts` + `mermaid-plan.ts` (plan_init), `probe.ts` (probe_done), `jobs.ts` (job tools), `practice.ts` (`problem`, `conclude`, `createPracticeGate`), `graph.ts` (`proberGraphTools`, `auditorGraphTools`), `web.ts` and `pdf-read.ts` (researcher only), `read/ls/find/grep.ts` + `fs-shared.ts` (learner files), `heal.ts` (`withArgumentHeal`, `healToolRecord`), `send-to-user.ts`.
- `subagents/`: `runner.ts` (`createJobRunner`), `pi-run.ts` (`runSubagent`), `researcher.ts`, `demo-builder.ts`, `visual-maker.ts`, `pdf-reader.ts` + `pdf-ops.ts`, `headless.ts` (browser/resvg/pdfjs, `headlessOverride` for tests), `extraction.ts` (`createExtractionPipeline`: `runExtraction`, `importNotes`), `submit-agent.ts` (`runSubmitAgent`), `bg-llm-semaphore.ts` (3 permits), `aborts.ts`.
- `subscription-*.ts`, `chatgpt-*.ts`: subscription provider status, admission (`SubscriptionRequestCycle`), streaming and the web transport channels.

### Shell (`app/`, `components/`)
- `components/chat.tsx`, `session.ts`, `session-core.ts`: the session view and its client state; `question-dock.tsx` (quizzes), `practice-dock.tsx` + `practice-cards.tsx` (practice problems), `plan-window.tsx` / `plan-block.tsx`, `activity-dock.tsx`, `composer.tsx`, `dictation.tsx`.
- `home.tsx`, `graph-view.tsx`, `graph-canvas.ts` (Canvas 2D renderer), `chain-table.tsx` (chain management and deletion), `notes-import.tsx`.
- `server-events.tsx`: the single `EventSource` per window.
- `artifacts/`: renderers for job results and tool cards.

### Electron (`electron/`)
`main.cjs` (launcher and security shell; spawns the standalone server with `LH_DATA_DIR=<userData>/data` and `LH_AUTH_FILE`; auto-update), `preload.cjs`, `chatgpt.cjs` + `chatgpt-ipc.cjs` (ChatGPT OAuth), `subscriptions.cjs` + `subscription-ipc.cjs` + `subscription-store.cjs` (GitHub Copilot/xAI via the Pi SDK), `desktop-api.cjs` (per-launch secret header), `web-subscription-browser.cjs`, `browser-service-readiness.cjs`, `server-title-guard.cjs`.

## Data Flow
- **Turn:** browser `POST /api/chat` → `handleChatRequest` → `parseChatInput` → model gate → `ensureCompacted` → write-ahead `chatStore.saveMessages` → `beginTurn` → build prober/teacher/practice agent from the record → `runPiTurn` streams SSE (clients can reattach via `GET /api/chats/[id]/stream`) → on finish `persistTurn`, `triggerExtraction` (not for practice), `applyParkedDismissal`, `kickCompaction`, `endTurn`.
- **Questions:** quiz/ask/problem tool calls stream to the browser, the learner answers in a dock, and the answer is sent back as the next chat input; a pending question saved in the record is what lets a session resume mid-question.
- **Background jobs:** research/demo/visual/pdf tools save a job (`jobStore`) and return an acknowledgement immediately; `createJobRunner` runs the sub-agent; `server/jobs.ts` delivers the result as a `subagent-steer` marker, either into the live turn or as a server-started wake turn once the session is idle and no question is pending.
- **Extraction:** when a chat's uncovered teacher-prose tokens reach `graph.extractionChunkTokens`, `runExtraction` batches them, the extractor proposes propositions + chains, the auditor (graph tools only, never the source) links them to existing nodes or creates new ones, and `mergeFindings` appends to the ledgers, simplifies chains, records coverage, then layout settles. A source's batches run in order. Notes import (`POST /api/graph/import`) uses the same pipeline.
- **Graph read:** `GET /api/graph` derives the snapshot from the ledgers (`deriveView`: each chain becomes an implication node). `PUT /api/graph/positions` is the only other graph write.
- **Practice:** a `kind: "practice"` chat created with `graphContext` propositions; the practice agent poses `problem` and closes with `conclude`. Only the chat record is written.
- **Change notification:** stores emit on `core/events.ts`; `GET /api/events` pushes notify-only events (`turn-started`, `turn-settled`, `jobs-changed`, `activity-changed`, `chats-changed`); clients refetch from normal endpoints.

## Entry Points
- Web dev: `npm run dev` (http://localhost:3000). Production web: `npm run build` then `npm start`.
- Desktop dev: `npm run desktop:dev` (Next dev + Electron pointed at it, `LH_DEV_URL`).
- Desktop package: `electron/main.cjs` spawns `.next/standalone/server.js` on loopback. Upstream's signed/notarized build is `npm run desktop:dist` (needs upstream's Apple credentials).
- Fork daily app: `npm run desktop:local` (`scripts/desktop-local.sh`) builds `origin/dev` in the sibling worktree `../learnharness-build` (ad-hoc signed, not notarized, `lhLocalBuild` so the auto-updater is off) and installs `/Applications/LearnHarness.app`. Its data lives in `~/Library/Application Support/LearnHarness/`.
- Fresh-user simulation: `npm run dev:fresh` (`scripts/dev-fresh.sh`, uses `.fresh-data/`).

## Commands and Workflows
- `npm test`: `NODE_ENV=test tsx --test tests/*.test.ts tests/*.test.tsx`. One file: `NODE_ENV=test npx tsx --test tests/<file>.test.ts`.
- `npm run typecheck` (`tsc --noEmit`), `npm run lint` (ESLint, includes the import zones).
- Smoke and packaging: `scripts/smoke-provider-runtime.mjs`, `scripts/build-server.mjs` (copies static assets and refuses bundles containing `data/`, `auth.json` or credentials), `scripts/smoke-server.mjs`, `scripts/smoke-web-subscriptions.mjs`, `scripts/smoke-demo-runtime.mjs`, `scripts/verify-release.ts`.
- Data scripts (run with `npx tsx --env-file=.env.local`): `scripts/import-notes.ts <dir>`, `scripts/backfill-graph.ts`, `scripts/replay-layout.ts`.
- Python skill tests: `python3 -B -m unittest discover -s tests/skills -v`.
- CI (`.github/workflows/ci.yml`, Node 26): typecheck, tests, lint; per-OS native renderer tests under Electron, build, and standalone smoke. `release.yml` builds desktop releases. Actions are disabled on this fork.
- Upstream intake: the `upstream` runnable reports waiting releases at onboard; merge with `git fetch origin && git merge --no-ff origin/main` on `dev`, only when the user asks, then reconcile `docs/architecture.md` (see `docs/fork-workflow.md`).
- Daily app: change on `dev` → push (`mem sync`) → `npm run desktop:local`.

## External Interfaces
- **HTTP API (`app/api`):** `chat` (POST turn); `chats` (list/create) and `chats/[id]` (read/rename/delete, `settings`, `steer`, `stream`, `dismiss`, `artifact-ui`, `markdown` export); `events` (SSE); `activity` + `activity/abort`; `jobs`; `graph` (snapshot, `status`, `costs`, `coverage/extract`, `import`, `nodes/[id]` DELETE, `positions`, `render-settings`); `keys`, `keys/[id]`; `models`; `search`; `settings`, `settings/[section]`, `settings/prompts`, `settings/prompts/[...segment]`; `stt/token`; `subscriptions`, `subscriptions/browser`.
- `proxy.ts`: in desktop mode, 403s `/api/*` requests without the `x-learnharness-desktop` header matching `LH_DESKTOP_API_SECRET` (`server/desktop-access.ts`); no-op in browser mode.
- **External services:** LLM providers through pi-ai (API keys in `auth.json` / `.env.local`, or subscription connections); Tavily/Brave web search (researcher); Deepgram STT (browser connects directly with a server-minted token).
- **Filesystem:** `data/` (or `LH_DATA_DIR`), `auth.json` and `*-credentials.json` beside it (or `LH_AUTH_FILE`'s directory), `data/debug/provider-events/` when enabled.
- `skills/learnharness/`: a Python skill that reads a LearnHarness data directory without the app (`references/data-format.md` documents the format).

## Tests and Verification
- `tests/` is flat: about 127 `*.test.ts` and 47 `*.test.tsx`, named `<area>-<topic>` (`render-*`, `session-*`, `graph-*`, `practice-*`, `chatgpt-*`, `subscription-*`, ...). No shared helpers directory; tests import production modules directly.
- Deterministic, no network or real LLM: engines use pi-ai's faux provider, `globalThis.fetch` is stubbed where needed, sub-agents use fake headless APIs (`headlessOverride`).
- Render tests use React `renderToStaticMarkup`, some with linkedom.
- Tests that touch data use `LH_DATA_DIR` and `mkdtemp` temp directories.
- `tests/fixtures/golden-data/`: a real data directory read through production paths (`tests/golden-fixtures.test.ts`); an intentional on-disk format change updates these fixtures in the same commit (see its README).
- Native renderer tests (`pdf-native-render`, `pdf-ops`, `svg-native-render`, `browser-service`) are also run under Electron in CI.

## Conventions and Patterns
- **Import law** (`eslint.config.mjs`, four `import/no-restricted-paths` zones): `components/**` imports only `@/src/core` (the barrel); `app/**` only `@/src/core` and `@/src/server`; `src/core/**` never imports `agent`/`server`/`store`; `src/agent/**` never imports `server`/`store`. `electron/`, `scripts/`, `tests/` are outside the law.
- The core barrel `src/core/index.ts` exports only browser-safe modules; node-bound core files (`graph.ts`, `coverage.ts`, `clusters.ts`, `session-clusters.ts`, `layout-settle.ts`) are imported directly by server code.
- One writer per store: chat records by the turn pipeline, jobs by the runner, graph ledgers only by the extraction merger (plus positions PUT).
- Graph evidence is append-only JSONL; everything else (snapshot, plan statuses, phases, costs, coverage, clusters) is derived at read time rather than stored.
- Deterministic ids for idempotency (steer ids, `arg_` chain ids, coverage fingerprints, notes source ids from path hashes).
- Side channels (extraction, usage, naming) are fire-and-forget behind try/catch; canonical persistence failures are surfaced, not swallowed.
- Schema stamps: chat records carry `version`; the graph family shares `data/graph/format.json`; records newer than the build are refused on read.
- `globalThis`-backed registries for process-wide state (turn liveness, turn runs, extraction runs, semaphore, event bus) to survive Next's per-entry module instances.
- Long comments carry dated owner rulings explaining decisions; match that style when editing nearby code.
- Upstream `AGENTS.md` rule "No guessing": ask the user before any design or implementation decision.
- `docs/architecture.md` describes this fork's code (project memory `architecture`): a change that alters what it describes updates it in the same commit, and upstream merges reconcile it. `docs/development.md` is upstream's and is stale in its Layout and Key mechanisms sections.
