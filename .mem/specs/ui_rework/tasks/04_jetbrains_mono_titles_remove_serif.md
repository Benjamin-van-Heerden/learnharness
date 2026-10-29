---
title: JetBrains Mono titles; remove the serif toggle
status: todo
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:29:01+02:00"
---

Spec §4. Make --font-title the JetBrains Mono stack at semibold. Take the chat header from text-3xl to text-2xl, and put the sidebar rows on font-title at their current size. Remove sessionNameSerif from src/core/settings.ts, settings-resolution.ts, src/server/settings-body.ts, appearance.tsx and appearance-section.tsx, and from tests (settings-body, settings-pure, settings-resolution, settings). Remove the CMU @font-face and public/fonts/cmunbx.ttf. Verify: a settings file still holding sessionNameSerif loads without error (test), typecheck, the settings tests.
