/** FORK: the Data folder row with a fake preload bridge — no Electron, no
 * filesystem. What it offers for each kind of folder, and that running
 * work blocks a switch. */
import React, { act } from "react";
(globalThis as Record<string, unknown>).React = React;
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { createRoot, type Root } from "react-dom/client";
import { parseHTML } from "linkedom";
import { DataFolderSettings, planFor, middleTruncate, type DataFolderBridge, type DataFolderKind, type DataFolderState } from "../components/settings/data-folder-settings.tsx";

const dom = parseHTML("<html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.document });
const originalFetch = globalThis.fetch;
const roots: Root[] = [];
const q = (host: ParentNode, id: string) => host.querySelector<HTMLElement>(`[data-testid='${id}']`);

afterEach(async () => {
	for (const root of roots.splice(0)) await act(async () => root.unmount());
	globalThis.fetch = originalFetch;
	delete window.lh;
});

function install(state: DataFolderState, picks: { path: string; kind: DataFolderKind }[] = []) {
	const applied: unknown[] = [];
	const bridge: DataFolderBridge = {
		get: async () => state,
		choose: async () => { const pick = picks.shift(); return pick ? { canceled: false, ...pick } : { canceled: true }; },
		apply: async (request) => { applied.push(request); },
	};
	window.lh = { expandWindow() {}, dataFolder: bridge };
	return applied;
}

function running({ busy = false, jobs = 0 } = {}) {
	globalThis.fetch = (async (url: string) => Response.json(url === "/api/chats" ? { chats: [{ busy }] } : { jobs: new Array(jobs).fill({}), extractions: [] })) as typeof fetch;
}

async function mount() {
	const host = document.createElement("div"); document.body.append(host);
	const root = createRoot(host); roots.push(root);
	await act(async () => { root.render(<DataFolderSettings />); });
	return host;
}

async function click(element: HTMLElement | null) {
	assert(element);
	await act(async () => { element.click(); });
}

const defaultState: DataFolderState = { available: true, path: "/Users/me/Library/Application Support/LearnHarness/data", isDefault: true, defaultPath: "/Users/me/Library/Application Support/LearnHarness/data", defaultKind: "current" };

describe("planFor", () => {
	it("moves into empty folders, switches to LearnHarness folders, refuses the rest", () => {
		assert.deepEqual(planFor("empty", "/cloud"), { kind: "confirm", text: "Move your data to /cloud? LearnHarness copies everything, checks it, deletes the old copy, and restarts.", action: "Move and restart", request: { path: "/cloud", mode: "move" } });
		assert.deepEqual(planFor("learnharness", "/cloud"), { kind: "confirm", text: "/cloud already has LearnHarness data. Switch to it? Your current data stays where it is.", action: "Switch and restart", request: { path: "/cloud", mode: "adopt" } });
		assert.equal(planFor("other", "/cloud")?.kind, "refuse");
		assert.equal(planFor("nested", "/cloud")?.kind, "refuse");
		assert.equal(planFor("current", "/cloud"), null);
		assert.deepEqual((planFor("missing", "/default", true) as { request: unknown }).request, { reset: true });
	});

	it("middle-truncates long paths and leaves short ones alone", () => {
		assert.equal(middleTruncate("/short"), "/short");
		const long = `/Users/me/Library/Mobile Documents/com~apple~CloudDocs/${"x".repeat(40)}/Learning`;
		const cut = middleTruncate(long, 30);
		assert.equal(cut.length, 30);
		assert(cut.startsWith("/Users/me/Libr"));
		assert(cut.endsWith("/Learning"));
	});
});

describe("DataFolderSettings", () => {
	it("renders nothing in the browser or the dev shell", async () => {
		assert.equal((await mount()).innerHTML, "");
		install({ available: false });
		assert.equal((await mount()).innerHTML, "");
	});

	it("shows the folder, offers Use default only away from the default, and applies a confirmed move", async () => {
		const applied = install({ ...defaultState, path: "/cloud/old", isDefault: false, defaultKind: "missing" }, [{ path: "/cloud/new", kind: "empty" }]);
		running();
		const host = await mount();
		assert.equal(q(host, "data-folder-path")?.textContent, "/cloud/old");
		assert(q(host, "data-folder-default"));
		await click(q(host, "data-folder-choose"));
		assert.match(q(host, "data-folder-plan")!.textContent!, /Move your data to \/cloud\/new\?/);
		await click(q(host, "data-folder-apply"));
		assert.deepEqual(applied, [{ path: "/cloud/new", mode: "move" }]);
	});

	it("Use default confirms a reset; a refused folder offers no action", async () => {
		const applied = install({ ...defaultState, path: "/cloud/data", isDefault: false, defaultKind: "learnharness" }, [{ path: "/Users/me/Documents", kind: "other" }]);
		running();
		const host = await mount();
		await click(q(host, "data-folder-choose"));
		assert.match(q(host, "data-folder-plan")!.textContent!, /other files in it/);
		assert.equal(q(host, "data-folder-apply"), null);
		await click(q(host, "data-folder-default"));
		assert.match(q(host, "data-folder-plan")!.textContent!, /already has LearnHarness data/);
		await click(q(host, "data-folder-apply"));
		assert.deepEqual(applied, [{ reset: true }]);
	});

	it("running sessions or background work block the switch", async () => {
		const applied = install(defaultState, [{ path: "/cloud/new", kind: "empty" }, { path: "/cloud/new", kind: "empty" }]);
		running({ busy: true });
		const host = await mount();
		await click(q(host, "data-folder-choose"));
		await click(q(host, "data-folder-apply"));
		assert.equal(q(host, "data-folder-message")?.textContent, "Wait for running sessions and background work to finish.");
		running({ jobs: 1 });
		await click(q(host, "data-folder-apply"));
		assert.deepEqual(applied, []);
		assert.equal(q(host, "data-folder-default"), null);
	});
});
