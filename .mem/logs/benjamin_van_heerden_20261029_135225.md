---
created_at: "2026-10-29T13:52:25+02:00"
user: benjamin_van_heerden
spec: ui_rework
---

# Work Log - UI rework (GitHub Dark, hatch, mono titles, auto-titles, working indicators)

## Goal

Rework the look of LearnHarness after the user's studii-next app, and close three UI todos: the visual refresh, better session titles, and the app looking idle while the agent works.

## What Was Accomplished

### Look (`app/globals.css`, `components/ui/button.tsx`)
- **GitHub Dark (default) palette** in `:root` and `.dark`:
  - surfaces: page `#0d1117`, raised `#161b22`, hover `#21262d`, borders `#30363d`;
  - text: body `#e6edf3`, muted `#8b949e`;
  - accent: primary `#1f6feb` with white text, ring `#2f81f7`, destructive `#f85149`.
  - Prose links use `--lh-link` (`#2f81f7`), and selection is a 40% tint of it.
- **Custom backgrounds:** `derivedPalette` (`components/settings/appearance.tsx`) now uses offsets +10/+21/+36 and no longer derives `--primary-foreground`.
- **Leftover `#141414`** replaced in the confidence rail (now `var(--background)`), the Background row hint/placeholder, and the Electron window and title-bar colours.
- **Square corners:** every `--radius*` token is `0px`, and the literal radii are gone. Studii's `chamfer-sm` (bottom-right 0.5rem cut via `clip-path`) is in the `Button` base and on the raw composer/home send buttons. `rounded-full` pills stay round.
- **Hatch:** Studii's `bg-hatch` utility is copied verbatim and applied to `body`: `repeating-linear-gradient(-45deg, color-mix(in srgb, var(--foreground) 7%, transparent) 0 1px, transparent 1px 7px)`. It shows on home, behind the graph canvas, and behind the chat transcript.
- **Titles:**
  - `--font-title` is the JetBrains Mono stack. Headings add `font-semibold` at each use, and the chat header drops from `text-3xl` to `text-2xl`. Sidebar rows and the rename field use `font-title` at the reading size.
  - Removed the `sessionNameSerif` setting end to end, the `lh-cmu` face, `public/fonts/cmunbx.ttf` and its OFL licence.

### Auto-titles
- **New `titler` background role:** `ModelRole`, `BACKGROUND_MODEL_ROLES`, and `ROLE_SLOT.titler = "cheap"`. The Cheap slot hint now mentions naming sessions.
- **`ChatRecord.titleSource`:** `"prompt"` (the default when absent), `"model"` or `"user"`. `ChatStore.renameChat(id, title, source)`, and the rename route passes `"user"`.
- **`src/server/session-title.ts`:**
  - `titleSession` makes one tool-less subagent call on the opening prompt, capped at 4,000 characters.
  - `sanitizeTitle` keeps the first line and strips a `Title:` label, quotes, markdown and trailing punctuation, then applies the `titleFromPrompt` cap.
  - It writes only while `titleSource` is `"prompt"`, then emits the new `chat-titled {chatId, title}` event.
- **Wiring:**
  - `titleSessionInBackground` in `chat-handler.ts` resolves the role, and skips when there's no model, no key or no background consent.
  - `POST /api/chats` fires it for teach and practice sessions.
  - `chat.tsx` listens for `chat-titled`.

### Working indicators
- **`SessionState.messageStreaming`:** `session-core.ts` now clears the slot before `message_end`'s notify, so that snapshot reads `false`.
- **`components/working-line.ts`:** `chat.tsx` shows a WORKING… spinner + shimmer line when the turn is streaming, no message is mid-stream, and nothing animated is last (not a reasoning row, and no `input-streaming` tool card). It never shows alongside THINKING… or compaction.
- **`components/elapsed-seconds.ts`:** `useElapsedSeconds` drives a live seconds tick on the streaming thinking row (`reasoning.tsx`) and on `LiveToolCard`.

### Verification
- **New tests:**
  - `tests/session-title.test.ts` (6);
  - a working-line suite in `tests/session-core.test.ts`, which drives a real tool step;
  - `tests/render-working-indicators.test.tsx`, which uses mocked timers.
- **Updated tests:** settings, appearance, composer, desktop-platform, role-pin and store tests. A settings file that still holds `sessionNameSerif` is shown to load.
- **Static checks:** repo-wide typecheck and lint are clean.
- **Install:** `npm run desktop:local` installed `f51777a`. The app logs the iCloud data folder and "updater disabled".

## Decisions

- **Hatch placement:** Studii's hatch sits under the chat prose too. The prose column is upstream's full width (`COLUMN = max-w-none`), so a solid reading column would have hidden the hatch in sessions entirely (user).
- **Theming:** GitHub Dark (default) with the blue accent is the built-in palette, with no preset picker (user; LearnHarness has no themes).
- **Pills:** `rounded-full` pills stay round (user, asked after the squares were in).
- **Chamfer:** only on buttons, as in Studii; cards and dialogs are plain squares (user).
- **Title font:** JetBrains Mono everywhere `font-title` appears, and the serif toggle is removed (user).
- **Titler model:** the titler runs on the Cheap slot. Agent settings has only slot rows (upstream removed per-role rows), so it's named in the slot hint. A per-role override is still possible in `settings.json` (user).
- **Titler timing:** titles come from the first message, not the first exchange. They are short sentence-case noun phrases, and a hand rename always wins (user).
- **Practice sessions get model titles too.** The spec assumed they had fixed titles, but they're titled from their opening text like teach sessions.
- **No settled duration:** a finished thinking row keeps upstream's static "Agent's thinking". Durations exist only live and would vanish on reload (user).
- **A dedicated `chat-titled` event** carries the title to the open header, because the header ignores `record-changed` mid-turn, which is exactly when the title arrives.
- **Title calls record no usage.** The chat record has no generic slot for background usage, and the call is tiny.

## Key Files Affected

- Look: `app/globals.css`, `app/layout.tsx`, `components/ui/button.tsx`, `components/composer.tsx`, `components/home.tsx`, `components/question-dock.tsx`, `components/practice-dock.tsx`, `components/confidence-rail.tsx`, `components/settings/appearance.tsx`, `components/settings/appearance-section.tsx`, `components/settings/settings-dialog.tsx`, `components/setup-dialog.tsx`, `components/top-bar.tsx`, `components/sidebar.tsx`, `electron/main.cjs`, `public/fonts/` (removed).
- Settings: `src/core/settings.ts`, `src/core/settings-resolution.ts`, `src/server/settings-body.ts`.
- Titles: `config.ts`, `src/core/contracts/chat.ts`, `src/core/events.ts`, `src/core/ports.ts`, `src/store/chats.ts`, `src/server/session-title.ts` (new), `src/server/chat-handler.ts`, `app/api/chats/route.ts`, `app/api/chats/[id]/route.ts`, `components/settings/agent-section.tsx`, `components/chat.tsx`.
- Indicators: `components/session-core.ts`, `components/session.ts`, `components/working-line.ts` (new), `components/elapsed-seconds.ts` (new), `components/ai-elements/reasoning.tsx`, `components/artifacts/live-tool-card.tsx`.
- Tests: `tests/session-title.test.ts` and `tests/render-working-indicators.test.tsx` (new), plus `session-core`, `settings*`, `render-settings`, `render-composer`, `desktop-platform`, `chat-flow`, `chat-store-events`, `zero-keys`, `model-catalog-setup` and `claude-code-context-ui`.
- Docs: `docs/architecture.md` (§3 Session titles, §10.2 `chat-titled`, three §12 fork seams), `.mem/structure.md`, `.mem/specs/ui_rework/`.
- Deleted todos: `visual_refresh_new_background_sharper`, `auto_summarized_session_titles_better_look`, `better_thinking_traces_while_agent`.
- Outside the repo: `/Applications/LearnHarness.app` reinstalled.
- Uncommitted and local only: `.claude/launch.json`, the `next dev` preview config this session used.

## Notes

- **Studii's background isn't cross-stitch:** its signed-in background (`studii-next/src/app/(app)/layout.tsx`) is `bg-hatch`, diagonals in one direction only.
- **The working-indicator gaps weren't reproduced against a live stream.** There were no provider-event recordings, and the dev data has no models. The gaps were traced in `session-core.ts` and `view.ts` instead:
  - tool cards already animated while executing;
  - the real silence is from a tool settling until the next `message_start`.
- **`mem task complete` treats a note starting with `--` as a flag.** The first attempt for the titles task committed nothing, and was rerun with reworded text.
- **The dev app shows 503 console errors** because the dev data has no models configured. They aren't a regression.
- **electron-builder** still prints the long "duplicate dependency references" notice, and the build still succeeds.
