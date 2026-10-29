---
title: Square corners and chamfered buttons
status: todo
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:29:01+02:00"
---

Spec §2. Set --radius and the --radius-sm/md/lg/xl/2xl tokens to 0. Remove the literal radii in globals.css (scrollbar thumb, code block, .lh-source-highlight). Leave rounded-full alone. Port Studii's chamfer-sm utility (--chamfer-sm 0.5rem in @theme static, no focus-visible escape) and apply it in the buttonVariants base in components/ui/button.tsx, dropping the size variants' rounded-md. Verify: a visual check of buttons, dialogs, the composer and the sidebar; the button render tests still pass.
