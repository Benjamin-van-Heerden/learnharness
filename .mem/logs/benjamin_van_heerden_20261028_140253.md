---
created_at: "2026-10-28T14:02:53+02:00"
user: benjamin_van_heerden
commits: [f2c7741]
---

# Work Log - Upstream v0.3.9 merge and hidden dictation UI

## Goal

Take upstream v0.3.9 into `dev` after reviewing it with the user. Hide the dictation feature, because the user dictates with Wispr Flow. Then rebuild the installed app.

## What Was Accomplished

### Upstream v0.3.9 merge (`251b103`)
- Ran `git merge --no-ff origin/main`: 44 upstream commits (v0.3.9 plus a README Discord link).
- v0.3.9 brings:
  - dictation language selection;
  - Retry for failed turns;
  - recoverable new-session opening;
  - model-slot repair after a provider disconnect;
  - a stricter probe→teach handoff (`probeDoneResultIds`: only a successful `probe_done` result counts);
  - superseded compaction summaries no longer replayed;
  - measured dock sizing.
- The only conflict was the status line of `docs/architecture.md`. We kept our line and applied upstream's link fix (`docs/archive/...`). `package.json` merged automatically: their version bump plus our `desktop:local` line.
- Reconciled `docs/architecture.md`:
  - `retry` added to the input list and the §5 sequence diagram;
  - the handoff is described as needing a successful `probe_done` result;
  - a new §5 bullet on retrying a failed response (`retryDrops` and its eligibility, no synthesized results for failed or aborted generations, the newest compaction summary superseding older markers).
- Verified:
  - `npm ci` on Node 26.12.1;
  - `typecheck` and `lint` clean;
  - 351/351 tests pass across the changed areas: retry, dictation, opening, phases, probe-done, compaction, model catalog, settings, auto-update, schema stamps.

### Hidden dictation UI (`f2c7741`)
- `DICTATION_UI = false` is a fork flag at the end of `src/core/dictation.ts`.
- `components/dictation.tsx`: the exported `DictationBar` returns `null` when the flag is off; the original body moved to `DictationBarView`. This covers the composer on home, new session and chat.
- `components/settings/keys-section.tsx` filters the "Dictation" group (the Deepgram key and the language picker) out of Settings → Providers.
- `src/core/keyboard.ts` registers `toggle-dictation` (Mod+D) only when the flag is on, so the shortcut never fires and drops off the cheat sheet.
- Upstream tests follow the flag:
  - `chatgpt-connection-ui` expects no Dictation group and no Deepgram row;
  - `tooltip-mechanism` expects the bare "Dictate" hint;
  - the three `dictation-picker` "Language is below the full key row" tests are skipped while the flag is off.
  - 160 pass and 3 are skipped across the settings, tooltip, dictation, keyboard, new-session and dock tests.
- Recorded as a seam row in `docs/architecture.md` §12 and in `.mem/structure.md`.

### Rebuild
- `npm run desktop:local` built `f2c7741` (version 0.3.9). It ran `npm ci` because the lockfile changed, quit the running app and reinstalled it.
- The relaunched app logs `auto-update: local build — updater disabled`, and the composer shows no Dictate bar.
- v0.3.9 now opens the "Set up your models" dialog at launch while no model slots are set.

## Decisions

- **Hide dictation rather than remove it** (user's choice). Deleting the dictation files would make every upstream change to them conflict. One flag and a few guarded lines keep merges cheap. Setting `DICTATION_UI = true` restores everything.
- **Mod+D counts as part of the UI**: it is unbound while dictation is hidden.

## Key Files Affected

- Merge: 78 upstream files. See `git diff 3dc8847 251b103^2`.
- `docs/architecture.md`: the conflict resolution, the v0.3.9 reconciliation and the dictation seam row.
- `src/core/dictation.ts`, `src/core/keyboard.ts`, `components/dictation.tsx`, `components/settings/keys-section.tsx`: the dictation flag.
- `tests/chatgpt-connection-ui.test.tsx`, `tests/tooltip-mechanism.test.tsx`, `tests/dictation-picker.test.tsx`: follow the flag.
- `.mem/structure.md`: the dictation note.
- Outside the repo: `/Applications/LearnHarness.app` reinstalled; `../learnharness-build` re-ran `npm ci`.

## Notes

- `npm ci` printed an `npm warn install-scripts` notice (npm 11 install-script review). Typecheck, tests and the Electron build all still worked.
- `mem` reports `.mem/structure.md` as out of date after the merge (72 code files changed). Only the dictation line was updated.
