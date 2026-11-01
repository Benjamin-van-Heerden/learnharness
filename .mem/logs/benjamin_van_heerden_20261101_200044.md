---
created_at: "2026-11-01T20:00:44+02:00"
user: benjamin_van_heerden
commits: ["90650e1"]
---

# Work Log - Upstream v0.4.1 merge and post-rework UI fixes

## Goal

Fix what the user spotted after the UI rework (input font, Import notes button, sidebar title size, the existing session's title), then take upstream v0.4.1 into `dev` and reinstall the daily app.

## What Was Accomplished

### UI fixes (`90650e1`)
- `.lh-input` now uses `var(--font-ui)`, so every typing field is JetBrains Mono at the reading size. Prose stays Source Sans 3.
- Removed the floating Import notes button from the home screen and graph view, and added `components/settings/notes-import-row.tsx` under Settings → Graph. Empty-state copy points there.
- Sidebar session titles and the rename field are `text-base` (14px).
- Renamed the user's one session to "Prediction markets like Polymarket" by editing its record while the app was closed (`titleSource: "model"`).

### Upstream v0.4.1 merge (`a92a5bf`)
- Merged `origin/main` with `--no-ff` (63 upstream commits) after `gh repo sync` fast-forwarded the mirror. pi is still 1.4.0 on npm, so GPT 6.1 Terra stays unavailable.
- v0.4.1 brings:
  - folder and PDF note imports through a page-wide queue;
  - source folders, renames and contribution-safe source deletion in the chain view;
  - chain-view keyboard navigation and scoped Find;
  - ranked auditor candidates and separate notes/session extraction framing;
  - per-slot cache retention and a session cache-hit stat;
  - malformed-question recovery;
  - Claude Code, keyboard-layout and `~/` path fixes.
- **Four conflicts:**
  - `components/graph-view.tsx` and `components/minimal-home.tsx`: dropped upstream's `NotesImportControl`, kept upstream's always-visible source inventory button.
  - `tests/render-graph-chrome.test.tsx`: follows that behaviour.
  - `docs/architecture.md`: see Decisions.
- **Semantic reconciliation beyond the conflicts:**
  - `notes-import-row.tsx` rewritten on upstream's queue: Files… and Folder… buttons, `.pdf` accepted, the queue's notices shown, and more files can join a running import.
  - `minimal-home.tsx` subscribes with `useNotesImport({ onFinish: readState })`, so an import started in Settings still refreshes the home summary.
  - `src/server/source-organization.ts` passes `"user"` to `renameChat`. Upstream's two-argument call failed typecheck, and a tree rename must beat a late auto-title. `tests/source-organization-route.test.ts` now pins this.
- Fixed `tests/settings-body.test.ts`, which pinned the old role list. It was broken by the `titler` work in the UI rework and wasn't in the test set run then.

### Verification
- `npm ci`, repo-wide typecheck and lint are clean. Lint's one warning is in upstream's `tests/source-name-ui.test.tsx`.
- 1,150 tests across every test file the merge changed plus the fork's areas passed, with the one role-list failure above and 3 intended dictation skips. After that fix, the re-run affected set passed (114).
- `npm run desktop:local` installed `a92a5bf`. The relaunched app logs the iCloud data folder and "updater disabled", and the session record is intact.

## Decisions

- **Import notes stays in Settings → Graph** after the merge, as two plain buttons. Upstream's control opens a popover menu, which the scrolling dialog would clip. `NotesImportControl` stays in `notes-import.tsx`, unused, for clean upstream merges.
- **`docs/architecture.md` keeps the fork's fuller spec.** Upstream condensed its copy from about 600 lines to 239. Per the architecture memory neither side wins wholesale, so the doc was rebuilt on our version and v0.4.1's facts were folded in: notes import, source organization, source deletion, auditor candidates, `SourceOrganizationStore`, `sources-changed`, cache retention.
- **The anydoc todo stays open.** v0.4.1 covers selectable-text PDF note imports only. Word, PowerPoint, EPUB and files dropped into a chat are still not parsed.

## Key Files Affected

- Fork fixes: `app/globals.css`, `components/sidebar.tsx`, `components/graph-view.tsx`, `components/minimal-home.tsx`, `components/settings/notes-import-row.tsx` (new), `components/settings/appearance-section.tsx`, `src/server/source-organization.ts`.
- Tests: `tests/render-graph-chrome.test.tsx`, `tests/render-settings.test.tsx`, `tests/settings-body.test.ts`, `tests/source-organization-route.test.ts`.
- Docs: `docs/architecture.md`, `.mem/structure.md`.
- The merge: about 130 upstream files.
- Outside the repo: `/Applications/LearnHarness.app` reinstalled; the session record in the iCloud data folder renamed.
- Uncommitted and local only: `.claude/launch.json`.

## Notes

- The Settings → Graph row wasn't seen in the running app: the dev preview's small window couldn't open the dialog, so a render test covers it. An actual folder or PDF import wasn't run.
- zsh doesn't word-split an unquoted variable, so `npx tsx --test $LIST` passes one bad path and runs nothing. Pipe the list through `xargs`.
- The relaunch log still reads `auth.json: ABSENT`, as before: the login is a subscription, not a BYOK key.
