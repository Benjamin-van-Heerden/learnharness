#!/usr/bin/env bash
#
# THE FORK'S DAILY-DRIVER BUILD: build the macOS app from the release
# branch and install it as /Applications/LearnHarness.app
# (docs/fork-workflow.md).
#
#   npm run desktop:local
#
# - Builds origin/release in a persistent worktree BESIDE the repo
#   (../learnharness-release), never this checkout, so half-finished dev
#   work never reaches the installed app. Inside the repo, tsc, eslint and
#   the Next tracer would pick the worktree up.
# - The same gates as desktop:dist, minus Developer ID signing and
#   notarization: an ad-hoc signature (identity "-"; left unset,
#   electron-builder signs with any certificate it finds in the keychain),
#   which needs hardenedRuntime off.
# - lhLocalBuild in the packaged package.json turns the auto-updater off
#   (electron/main.cjs): the baked feed is upstream's releases.
# - App data lives in ~/Library/Application Support/LearnHarness and is
#   never touched. Any failed step stops before the installed app is.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE="$(dirname "$ROOT")/learnharness-release"
APP_NAME="LearnHarness"
INSTALLED="/Applications/$APP_NAME.app"
LOCK_STAMP="node_modules/.desktop-local-lock"

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
	sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
	exit 0
fi

step() { echo "── $* ──"; }

step "release branch"
git -C "$ROOT" fetch -q origin release
if [ -d "$WORKTREE" ]; then
	# Only tracked edits count as dirty: build output is git-ignored.
	if [ -n "$(git -C "$WORKTREE" status --porcelain --untracked-files=no)" ]; then
		echo "error: $WORKTREE has local edits; commit or discard them first" >&2
		exit 1
	fi
	git -C "$WORKTREE" checkout -q --detach origin/release
else
	git -C "$ROOT" worktree add -q --detach "$WORKTREE" origin/release
fi
cd "$WORKTREE"
echo "  building $(git log -1 --format='%h %s') ($(node -p 'require("./package.json").version'))"

if ! cmp -s package-lock.json "$LOCK_STAMP"; then
	step "npm ci (lockfile changed)"
	npm ci
	cp package-lock.json "$LOCK_STAMP"
fi

step "next build"
rm -rf dist .next/standalone
npx next build
# next build rewrites this generated file for build-time types; restore it
# so the worktree's dirty check passes on the next run.
git checkout -q -- next-env.d.ts
node scripts/smoke-provider-runtime.mjs
node scripts/build-server.mjs
node scripts/smoke-server.mjs --electron

step "electron-builder (ad-hoc, no notarization, updates off)"
DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}" npx electron-builder --mac --arm64 --dir --publish never \
	-c.mac.identity=- -c.mac.hardenedRuntime=false -c.mac.notarize=false -c.extraMetadata.lhLocalBuild=true
BUILT="$WORKTREE/dist/mac-arm64/$APP_NAME.app"
[ -d "$BUILT" ] || { echo "error: electron-builder produced no $BUILT" >&2; exit 1; }

step "install"
if pgrep -xq "$APP_NAME"; then
	echo "  quitting the running $APP_NAME"
	osascript -e "tell application \"$APP_NAME\" to quit"
	# The server child runs from inside the bundle: wait for every process.
	for _ in $(seq 60); do pgrep -xq "$APP_NAME" || break; sleep 1; done
	if pgrep -xq "$APP_NAME"; then
		echo "error: $APP_NAME is still running; quit it and rerun" >&2
		exit 1
	fi
fi
rm -rf "$INSTALLED"
ditto "$BUILT" "$INSTALLED"
echo "  installed $INSTALLED — $(git log -1 --format='%h %s')"
