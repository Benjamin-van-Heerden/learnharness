---
title: Hatch page background with a solid reading column
status: completed
created_at: "2026-10-29T13:29:01+02:00"
updated_at: "2026-10-29T13:37:46+02:00"
completed_at: "2026-10-29T13:37:46+02:00"
---

Spec §3. Port Studii's bg-hatch utility verbatim into globals.css and apply it to the app shell's page background. Give the chat transcript and composer column a solid bg-background panel so prose never sits on the hatch. Home and graph show the hatch; the sidebar, top bar, dialogs, popovers and docks stay solid. Verify visually, including with a custom Appearance Background, which the hatch must follow.

## Completion Notes

Ported Studii's bg-hatch utility verbatim into app/globals.css and painted it on body, so every transparent surface shows it: home, the graph (its canvas clears to transparent) and, by user ruling during implementation, the chat transcript too. The prose column is upstream's full width, so a solid reading column would have hidden the hatch in sessions entirely; the spec is revised to match. Sidebar, dialogs, popovers and docks keep their own solid backgrounds. The hatch reads --background/--foreground, so a custom Appearance background carries it. Verified in the dev app on home and a session.
