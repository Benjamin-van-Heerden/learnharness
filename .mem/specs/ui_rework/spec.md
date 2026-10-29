---
title: UI rework
status: active
assigned_to: benjamin_van_heerden
created_at: "2026-10-29T13:26:09+02:00"
updated_at: "2026-10-29T13:31:40+02:00"
---

## Overview

A visual refresh of LearnHarness, plus the session-title and "is it still working?" fixes. It covers four todos: `visual_refresh_new_background_sharper`, `auto_summarized_session_titles_better_look`, `better_thinking_traces_while_agent`, and the title-font half of the session-title todo.

The look is borrowed from the user's studii-next app (`~/Documents/Studii/studii-next`): a diagonal hatch background, square corners and chamfered buttons, on a GitHub Dark palette. Session titles become JetBrains Mono, and a cheap model writes them from the first message. The chat stops looking idle between steps, while reasoning is hidden, and while tools run.

## Goals

- GitHub Dark (default) is the built-in palette, with GitHub's blue as the accent.
- Studii's `bg-hatch` behind the page, including under the chat prose.
- Square corners everywhere, and Studii's bottom-right chamfer on buttons.
- Session titles and dialog headings in JetBrains Mono. The serif toggle and CMU Serif are removed.
- A new `titler` background role, on the cheap slot by default, writes a 3–6 word sentence-case title from the first message. Hand renames are never overwritten.
- While a turn runs, something always visibly moves: between steps, during hidden reasoning, and while a tool executes.

## Decisions (user, 2026-10-29)

- **Background:** Studii's hatch as-is.
- **Hatch placement:** on the page, not under the reading column. Revised during implementation: the chat prose spans the full content width (upstream's `COLUMN = max-w-none`), which leaves no margins, so the hatch now also sits under the prose, as in Studii (user, 2026-10-29).
- **Corners:** Studii's style, square with a chamfer, applied as Studii does (buttons and badges only, not cards or dialogs).
- **Palette:** GitHub Dark (default) as the built-in palette, with no preset picker. Use the blue accent.
- **Other visual changes:** none for now.
- **Title font:** JetBrains Mono everywhere `font-title` is used. Drop the serif toggle.
- **Auto-titles:** written from the first message, by a new `titler` role on the cheap slot. Short sentence-case noun phrase. Revised during implementation: Agent settings shows only the three slots (upstream removed the per-role rows), so the titler is named in the Cheap slot's roster hint, with a per-role override possible in settings.json like every other role (user, 2026-10-29).
- **Working indicators:** fix all three gaps: between steps, hidden reasoning, and tools running.

## Technical Approach

### 1. GitHub Dark palette (`app/globals.css`, `components/settings/appearance.tsx`)

Replace the hexes in both the `:root` and `.dark` blocks, keeping the two in step:

| Token | Today | New |
|---|---|---|
| `--background` | #141414 | #0d1117 |
| `--card`, `--popover`, `--secondary`, `--muted` | #1c1c1c | #161b22 |
| `--accent` (hover surface, not the brand colour) | #2a2a2a | #21262d |
| `--border`, `--input` | #434343 | #30363d |
| `--foreground` and the `*-foreground` tokens on surfaces | #e6e6e6 | #e6edf3 |
| `--muted-foreground` | #8d8d8d | #8b949e |
| `--primary` (buttons, selected states) | #e6e6e6 | #1f6feb |
| `--primary-foreground` | #141414 | #ffffff |
| `--ring` (focus, links) | #8d8d8d | #2f81f7 |
| `--destructive` | oklch red | #f85149 |

Add `--lh-link: #2f81f7` and point prose links at it, if links don't already read `--primary` or `--ring`. Also set `::selection` to the blue at about 40%.

The custom-background derivation (`derivedPalette`) applies only when the user sets Settings → Appearance → Background:
- change its offsets to GitHub's ladder: card +10, accent +21, border +36;
- stop it overriding `--primary-foreground` (white text on blue must stay white);
- update the doc comment.

Replace the remaining hard-coded `#141414` with `#0d1117`: `components/confidence-rail.tsx` (the rail base), the Background row hint and placeholder in `components/settings/appearance-section.tsx`, and the comment at `src/core/settings.ts:509`. The confidence-rail stop colours stay. Fix code blocks (`[data-streamdown="code-block"]`) and other `color-mix` spots only if they look wrong on the new base.

### 2. Square corners and chamfered buttons (`app/globals.css`, `components/ui/button.tsx`)

- Set `--radius` and the `--radius-sm/md/lg/xl` ladder in `@theme` to `0`. `rounded-sm/md/lg/xl/2xl` then square off app-wide. `rounded-2xl` needs `--radius-2xl: 0` added.
- Remove the literal radii in `globals.css`: scrollbar thumb 8px, code block 0.75rem, `.lh-source-highlight` 0.25rem.
- `rounded-full` stays round: it draws circles (dots, spinners, toggle knobs), not corners.
- Port Studii's `chamfer-sm` utility, with `--chamfer-sm: 0.5rem` in a `@theme static` block. The `:focus-visible` escape isn't needed, because the no-ring law means no ring is ever clipped. Apply it in the base class of `buttonVariants` and drop the size variants' `rounded-md`. LearnHarness has no badge primitive, so chips stay plain squares.

### 3. Hatch background

- Port Studii's utility verbatim: `@utility bg-hatch { background-color: var(--background); background-image: repeating-linear-gradient(-45deg, color-mix(in srgb, var(--foreground) 7%, transparent) 0 1px, transparent 1px 7px); }`
- Apply it to the app shell's page background, the element that today paints `bg-background` behind the sidebar and content.
- The hatch also sits under the chat transcript, as in Studii (revised: the prose column is full-width, so a solid column would hide the hatch in sessions entirely).
- The home screen and the graph view show the hatch.
- Every surface that should stay solid keeps its own background: sidebar, top bar, dialogs, popovers, docks.
- Because the hatch reads `--background` and `--foreground`, a custom Background setting carries it automatically.

### 4. Mono titles

- `--font-title` in the non-inline `@theme` becomes the JetBrains Mono stack (`var(--font-jetbrains), ui-monospace, …`) at `font-weight: 600`. Either make `font-title` carry the weight, or add `font-semibold` at its uses in `chat.tsx`, `setup-dialog.tsx` and `settings-dialog.tsx`.
- Reduce the chat header title from `text-3xl` to `text-2xl`, since mono runs wide. Keep `tracking-tight`.
- Sidebar rows also switch to `font-title` at their current size, not bold, so a session reads the same in both places.
- Remove the serif setting and font:
  - `sessionNameSerif` from `src/core/settings.ts`, `settings-resolution.ts`, `src/server/settings-body.ts`, `components/settings/appearance.tsx` and `appearance-section.tsx`, along with its tests;
  - the CMU `@font-face` and `public/fonts/cmunbx.ttf`.

  Old settings files keep the key harmlessly, because the read side preserves unknown keys verbatim.

### 5. Auto-titles (`titler` role)

- **Role:**
  - add `"titler"` to `ModelRole` (`config.ts`) and `BACKGROUND_MODEL_ROLES` (`src/core/settings.ts`), with `ROLE_SLOT.titler = "cheap"`;
  - the Cheap slot's roster hint in Agent settings mentions naming sessions (there are no per-role rows).
  - update the tests that pin the role set.
- **Persisting:** add `titleSource?: "prompt" | "model" | "user"` to the chat record (`src/core/contracts/chat.ts`).
  - Creation writes `"prompt"`; absence also means `"prompt"`, so no migration is needed.
  - The rename route `PUT /api/chats/[id]` writes `"user"`.
- **When:** in `POST /api/chats` (`app/api/chats/route.ts`), after `createChat`, fire and forget `generateTitle(chat.id, fullPrompt)`. It must never block or fail the create.
  - `fullPrompt` is the untruncated `body.title`.
  - Skip it when the body has no prompt ("Untitled session"). Practice sessions are titled from their opening text just like teach sessions (checked during implementation), so they get model titles too.
- **The call:** a new `src/server/session-title.ts` resolves the `titler` engine the way other background roles do (role override, then cheap slot).
  - Reuse `runSubagent` with no tools, or the lightest existing one-shot path. Follow how `src/server/compaction.ts` runs its summary.
  - Prompt: write a 3–6 word sentence-case noun phrase naming the topic, with no quotes and no trailing punctuation. Output only the title. Pass the prompt as the user message, capped at about 4,000 characters.
  - Sanitize the reply (one line, quotes stripped), then run it through `titleFromPrompt`'s length cap.
  - Record usage and cost like other background calls, if that is how the role plumbing works.
- **Write-back:** re-read the chat. If `titleSource` is still `"prompt"`, set the title and `titleSource: "model"`, the rename emits `chats-changed` for the sidebar, and a new `chat-titled {chatId, title}` event updates an open header. `record-changed` couldn't do this, because the header ignores it mid-turn, which is exactly when the title arrives.
- **Failure:** no cheap model configured, a provider error, or an empty reply all leave the prompt title and log at debug/info. Nothing reaches the user.

### 6. Working indicators (`components/chat.tsx`, `components/ai-elements/reasoning.tsx`, the live tool card)

- **Between steps:** while the turn is running (`status === "streaming"` or `turnInFlight`), and the last rendered part is neither streaming nor a live tool card, show the same spinner + shimmer line at the bottom of the transcript. Label it "Working…", in the existing THINKING… register.
  - It must stay mutually exclusive with the THINKING… placeholder and the compaction line.
  - It disappears the moment new tokens render.
- **Hidden reasoning:** a reasoning part with empty text that is still streaming keeps an animated trigger ("Thinking" shimmer) with elapsed seconds (`Thinking · 12s`). Once done it collapses to "Thought for 12s". Check what `ReasoningTrigger` already does with duration, and extend it rather than add a second timer.
- **Tools running:** find which tool states render a static card while executing. Today's `LiveToolCard` covers `input-streaming`. Check `input-available` (executing, before output), job-dispatch parts and provider-side tools (web search). Keep them animated with an elapsed timer until the output lands.
- Reproduce each gap first with a ChatGPT-subscription session, or a recorded provider stream under `debug/`, so the fix is checked against a real stream.

### 7. Docs and install

- `docs/architecture.md`:
  - add `titler` to the roles, slots and seams;
  - add `titleSource` to the chat-record description;
  - add a "Fork UI rework" seam row covering the palette, radius and hatch tokens, the title font, and the removed serif toggle;
  - update §4/§5 wherever it lists roles or title behaviour.
- `.mem/structure.md`: add the new `session-title.ts` module.
- Then commit, `mem sync`, and run `npm run desktop:local` to install.

## Success Criteria

- `app/globals.css` `:root` and `.dark` carry the GitHub Dark hexes in the table above, and `#141414` no longer appears in `app/`, `components/` or `src/` except in tests that assert the old value has changed.
- The `--radius*` tokens are `0`. `globals.css` has no literal `border-radius` other than `9999px`/`rounded-full` uses. `buttonVariants` applies `chamfer-sm`.
- The `bg-hatch` utility exists and is applied to the app shell. The hatch shows behind the chat transcript as well.
- `font-title` resolves to JetBrains Mono. `sessionNameSerif`, the serif row in Appearance, the CMU `@font-face` and `cmunbx.ttf` are gone, and settings files that still contain `sessionNameSerif` load without error.
- `BACKGROUND_MODEL_ROLES` contains `titler` with `ROLE_SLOT.titler === "cheap"`. The Cheap slot's roster hint mentions naming sessions.
- `POST /api/chats` with a prompt returns at once with the truncated title. A test with a fake titler engine shows the title replaced by the model's sanitized phrase and `titleSource: "model"`, and a `chats-changed` event emitted.
- Renaming sets `titleSource: "user"`. A model title arriving after a rename does not overwrite it (tested). With no cheap model, the prompt title stays and nothing throws (tested).
- During a running turn, a render test shows the "Working…" line when the last part is a settled tool or a finished reasoning part, and shows it absent while text streams.
- An empty streaming reasoning part shows an animated trigger with elapsed time.
- Executing tool cards stay animated until output.
- Typecheck and lint are clean, and the targeted tests for settings, appearance, chats routes, the session title, chat rendering and roles pass.
- The installed app shows the new look on the iCloud data folder.

## Notes

- **Reference implementation:** `~/Documents/Studii/studii-next/src/app/globals.css` (`bg-hatch`, `chamfer-*`) and `src/app/(app)/layout.tsx` (where the hatch is applied).
- **The appearance system:** `derivedPalette` turns one Background colour into the whole surface ladder. Keep that model; only the offsets and the primary-foreground rule change.
- **The no-ring law** (no focus outlines anywhere) stands. The blue `--ring` only shows where components draw their own ring utilities.
- **Upstream merges:** these are token-level changes in upstream files (`globals.css`, `button.tsx`, `chat.tsx`). Keep the edits surgical and record them in the §12 seam row, so the next upstream merge knows what to reconcile.
- **Out of scope:** theme presets or a picker, a light mode, a richer reasoning display (expanded traces or a step list), image pasting, and anydoc. Those are separate todos.
