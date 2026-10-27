---
title: Add desktop:local build-and-install script
status: todo
created_at: "2026-10-27T12:06:57+02:00"
updated_at: "2026-10-27T12:06:57+02:00"
---

Spec section 2. Create scripts/desktop-local.sh (bash, set -euo pipefail) and the package.json script 'desktop:local': 'bash scripts/desktop-local.sh'. Persistent worktree of origin/release (detached) at ../learnharness-release (sibling of the repo, never inside it); refuse a dirty worktree. npm ci on first run or when package-lock.json changed (stamp file in node_modules). Steps: rm -rf dist .next/standalone; next build; node scripts/smoke-provider-runtime.mjs; node scripts/build-server.mjs; node scripts/smoke-server.mjs; DEVELOPER_DIR default /Applications/Xcode.app/Contents/Developer; npx electron-builder --mac --arm64 --dir --publish never -c.mac.identity=- -c.mac.hardenedRuntime=false -c.mac.notarize=false -c.extraMetadata.lhLocalBuild=true. Install: quit a running LearnHarness via osascript and wait, replace /Applications/LearnHarness.app with dist/mac-arm64/LearnHarness.app (rm old, ditto), print version and built commit. Any failure stops before touching the installed app. Verify the build steps work by running them once against a throwaway worktree of the current dev HEAD (not installing into /Applications), and check codesign -dv shows an ad-hoc signature and the packaged package.json contains lhLocalBuild.
