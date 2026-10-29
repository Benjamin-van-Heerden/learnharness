---
title: Square corners and chamfered buttons
status: completed
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:36:30+02:00"
completed_at: "2026-10-29T13:36:30+02:00"
---

Spec §2. Set --radius and the --radius-sm/md/lg/xl/2xl tokens to 0. Remove the literal radii in globals.css (scrollbar thumb, code block, .lh-source-highlight). Leave rounded-full alone. Port Studii's chamfer-sm utility (--chamfer-sm 0.5rem in @theme static, no focus-visible escape) and apply it in the buttonVariants base in components/ui/button.tsx, dropping the size variants' rounded-md. Verify: a visual check of buttons, dialogs, the composer and the sidebar; the button render tests still pass.

## Completion Notes

Every radius token (--radius, --radius-xs..4xl) is 0 in app/globals.css and the literal radii (scrollbar thumb, code block, source highlight) are gone. Studii's chamfer-sm utility (--chamfer-sm 0.5rem, no focus-visible escape under the no-ring law) is in the Button base and on the raw composer/home send buttons; arbitrary rounded-[10px]/[6px] removed from the composer, home, question and practice docks. rounded-full pills stay round (user ruling). Verified: typecheck clean; render-composer and render-settings tests pass (41, the composer corner test now pins the chamfer); dev app shows square surfaces and the chamfered send button.
