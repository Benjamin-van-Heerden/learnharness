---
created_at: "2026-10-29T09:20:25+02:00"
user: benjamin_van_heerden
commits: [a916ef7]
---

# Work Log - Upstream v0.4.0 merge

## Goal

Take upstream LearnHarness v0.4.0 into `dev` at the user's request, keep the fork's changes intact, and reinstall the daily app.

## What Was Accomplished

- **Checked pi first:** npm and GitHub still have pi 1.4.0, the release from 21 October, as the latest, and v0.4.0 also pins 1.4.0. GPT 6.1 Terra therefore still isn't available.
- **Merge `4856542`** (`git merge --no-ff origin/main`, 60 upstream commits). v0.4.0 brings:
  - the Claude Code CLI provider;
  - one custom OpenAI-compatible endpoint;
  - desktop drag-and-drop of local file paths;
  - bounded image processing;
  - question-dock and math-rendering fixes;
  - Next.js 16.4.3.
- **Four conflicts, each resolved by keeping both sides:**
  - `components/settings/keys-section.tsx`: the new External CLI group, with our `DICTATION_UI` filter still applied to the Dictation group;
  - `components/sidebar.tsx`: the `FilePathDropZone` import, plus our `DataFolderBridge` type import;
  - `tests/chatgpt-connection-ui.test.tsx`: the headings now include External CLI, and Dictation only when `DICTATION_UI` is on;
  - `tests/desktop-platform.test.ts`: the preload surface pins both `dataFolder` and `getPathForFile`.
- **Dictation fallback checked:** the drop zone's fallback, `appendToPrimaryInput`, uses the composer target that `useDictation` registers. That target is still mounted with the dictation UI hidden, so drops still land in the composer.
- **Verified:**
  - `npm ci`, `typecheck` and `lint` are clean;
  - 246 tests pass across file paths, path input, agent image paths, ChatGPT and settings UI, desktop/preload, automatic updates, the data folder, model catalog, auth store and schema stamps;
  - a further 104 pass across dictation, settings and keyboard, with the 3 intended dictation skips.
- **Docs commit `a916ef7`:**
  - `docs/architecture.md` §5 gains a "Local file references" bullet; §8 now lists `getPathForFile` on the preload and gains a new §8.0 for the Claude Code and custom-endpoint model routes;
  - `.mem/structure.md` lists the new server, agent and component modules.
- **Reinstalled:** `npm run desktop:local` built `a916ef7` (0.4.0), re-running `npm ci` because the lockfile changed. The relaunched app logs the iCloud data folder and "updater disabled".

## Key Files Affected

- The merge: about 157 upstream files.
- Conflict resolutions: `components/settings/keys-section.tsx`, `components/sidebar.tsx`, `tests/chatgpt-connection-ui.test.tsx`, `tests/desktop-platform.test.ts`.
- Docs: `docs/architecture.md`, `.mem/structure.md`.

## Notes

- electron-builder now prints a long "duplicate dependency references" notice while packaging. The build and install still succeed.
- Drag-and-drop only inserts path text. The agent's `read` tool handles text and images, and the PDF tool only reads PDFs fetched with `web_fetch_pdf`, so dropped PDF, Word, PowerPoint or EPUB files aren't parsed yet. That is the remaining scope of the anydoc todo.
