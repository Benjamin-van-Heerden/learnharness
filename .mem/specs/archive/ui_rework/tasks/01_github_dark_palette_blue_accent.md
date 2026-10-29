---
title: GitHub Dark palette with blue accent
status: completed
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:34:43+02:00"
completed_at: "2026-10-29T13:34:43+02:00"
---

Spec §1. Replace the :root and .dark hexes in app/globals.css with the GitHub Dark table. Retune derivedPalette in components/settings/appearance.tsx to card +10 / accent +21 / border +36, and stop it overriding --primary-foreground. Replace the remaining #141414 in confidence-rail.tsx, appearance-section.tsx (Background hint and placeholder) and the settings.ts:509 comment. Add the link colour and ::selection. Update the appearance tests that pin the derivation. Verify: typecheck, the appearance and settings tests, and a visual check in the dev app.

## Completion Notes

GitHub Dark (default) palette in app/globals.css (:root and .dark): page #0d1117, raised #161b22, hover #21262d, borders #30363d, text #e6edf3, muted #8b949e, primary #1f6feb with white text, ring #2f81f7, destructive #f85149; prose links use --lh-link #2f81f7 and selection is a 40% link-blue tint. derivedPalette now uses +10/+21/+36 and no longer overrides --primary-foreground. #141414 is gone from the Background hint/placeholder, the confidence rail (now var(--background)) and the Electron window/title-bar colours. Verified: typecheck clean; settings-pure, render-settings, desktop-platform and settings tests pass (95); dev app renders the new palette.
