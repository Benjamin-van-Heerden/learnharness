---
title: JetBrains Mono titles; remove the serif toggle
status: completed
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:39:49+02:00"
completed_at: "2026-10-29T13:39:49+02:00"
---

Spec §4. Make --font-title the JetBrains Mono stack at semibold. Take the chat header from text-3xl to text-2xl, and put the sidebar rows on font-title at their current size. Remove sessionNameSerif from src/core/settings.ts, settings-resolution.ts, src/server/settings-body.ts, appearance.tsx and appearance-section.tsx, and from tests (settings-body, settings-pure, settings-resolution, settings). Remove the CMU @font-face and public/fonts/cmunbx.ttf. Verify: a settings file still holding sessionNameSerif loads without error (test), typecheck, the settings tests.

## Completion Notes

Titles are now JetBrains Mono: the font-title token is the mono stack, and headings carry font-semibold at each use (chat header, top bar, Settings, Setup); the chat header title drops from text-3xl to text-2xl. Sidebar rows and the sidebar rename field use font-title at the reading size, regular weight. Removed the serif toggle end to end: sessionNameSerif from the settings type, factory, read sanitizer, resolution, PUT body parser, appearanceVars and the Appearance row; removed the lh-cmu @font-face, public/fonts/cmunbx.ttf and its OFL licence. Verified: typecheck clean; 144 settings, render and dialog tests pass, including a settings file that still carries sessionNameSerif loading with the key dropped; the dev app shows mono titles.
