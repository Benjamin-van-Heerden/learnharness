---
title: GitHub Dark palette with blue accent
status: todo
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:29:01+02:00"
---

Spec §1. Replace the :root and .dark hexes in app/globals.css with the GitHub Dark table. Retune derivedPalette in components/settings/appearance.tsx to card +10 / accent +21 / border +36, and stop it overriding --primary-foreground. Replace the remaining #141414 in confidence-rail.tsx, appearance-section.tsx (Background hint and placeholder) and the settings.ts:509 comment. Add the link colour and ::selection. Update the appearance tests that pin the derivation. Verify: typecheck, the appearance and settings tests, and a visual check in the dev app.
