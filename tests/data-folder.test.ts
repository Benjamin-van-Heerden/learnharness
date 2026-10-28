/** FORK: the Electron flow of the choosable data folder
 * (electron/data-folder.cjs), driven with fake dialogs. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveAtStartup } = require("../electron/data-folder.cjs");
const { readLocation, writeLocation } = require("../electron/data-location.cjs");

const tmp = (label: string) => fs.mkdtempSync(path.join(os.tmpdir(), `lh-data-folder-${label}-`));

/** A dialog that answers the startup box with `answers` in turn and the
 *  folder picker with `picks` in turn, recording what it was asked. */
function fakeDialog(answers: number[], picks: (string | undefined)[] = []) {
	const boxes: string[] = [];
	return {
		boxes,
		showMessageBoxSync: (options: { message: string }) => { boxes.push(options.message); return answers.shift() ?? 2; },
		showOpenDialogSync: () => { const pick = picks.shift(); return pick ? [pick] : undefined; },
	};
}

describe("resolveAtStartup", () => {
	it("uses the default or an existing chosen folder without asking", () => {
		const userData = tmp("ok");
		const dialog = fakeDialog([]);
		assert.equal(resolveAtStartup({ userData, dialog }), path.join(userData, "data"));
		const chosen = tmp("chosen");
		writeLocation(userData, chosen);
		assert.equal(resolveAtStartup({ userData, dialog }), chosen);
		assert.deepEqual(dialog.boxes, []);
	});

	it("a missing chosen folder asks, never falls back: Try Again succeeds once it appears, Quit returns null", () => {
		const userData = tmp("missing");
		const chosen = path.join(tmp("cloud"), "Learning");
		writeLocation(userData, chosen);

		const quit = fakeDialog([2]);
		assert.equal(resolveAtStartup({ userData, dialog: quit }), null);
		assert.equal(quit.boxes.length, 1);

		let tries = 0;
		const retry = {
			...fakeDialog([]),
			showMessageBoxSync: () => { if (++tries === 2) fs.mkdirSync(chosen); return 0; },
		};
		assert.equal(resolveAtStartup({ userData, dialog: retry }), chosen);
		assert.equal(tries, 2);
	});

	it("Choose Another Folder accepts an empty or LearnHarness folder and refuses one with other files", () => {
		const userData = tmp("choose");
		writeLocation(userData, path.join(tmp("gone"), "nope"));
		const other = tmp("other");
		fs.writeFileSync(path.join(other, "taxes.pdf"), "x");
		const empty = tmp("empty");

		const dialog = fakeDialog([1, 0, 1], [other, empty]);
		assert.equal(resolveAtStartup({ userData, dialog }), empty);
		assert.deepEqual(dialog.boxes, ["LearnHarness can't open its data folder", "That folder can't be used", "LearnHarness can't open its data folder"]);
		assert.equal(readLocation(userData).dataDir, empty);
	});

	it("a corrupt setting asks instead of guessing", () => {
		const userData = tmp("corrupt");
		fs.writeFileSync(path.join(userData, "data-location.json"), "{oops");
		const dialog = fakeDialog([2]);
		assert.equal(resolveAtStartup({ userData, dialog }), null);
		assert.equal(dialog.boxes.length, 1);
	});
});

const { registerDataFolderIPC } = require("../electron/data-folder.cjs");

/** Registers the handlers against fakes and records the order of effects. */
function ipcFixture(userData: string, dataDir: string, { available = true, trusted = true } = {}) {
	const handlers = new Map<string, (event: unknown, arg?: unknown) => unknown>();
	const events: string[] = [];
	const errors: string[] = [];
	let picked: string | undefined;
	registerDataFolderIPC({
		ipcMain: { handle: (channel: string, fn: (event: unknown, arg?: unknown) => unknown) => handlers.set(channel, fn) },
		dialog: {
			showOpenDialog: async () => (picked ? { canceled: false, filePaths: [picked] } : { canceled: true, filePaths: [] }),
			showErrorBox: (_title: string, body: string) => { errors.push(body); },
		},
		app: { relaunch: () => events.push("relaunch"), exit: () => events.push("exit") },
		BrowserWindow: { fromWebContents: () => undefined },
		userData, available,
		getDataDir: () => dataDir,
		isTrusted: () => trusted,
		stopServer: async () => { events.push(`stop:${fs.existsSync(dataDir) ? "source-present" : "source-gone"}`); },
		log: () => {},
	});
	const call = (channel: string, arg?: unknown) => handlers.get(channel)!({ sender: {} }, arg);
	return { call, events, errors, pick: (value: string | undefined) => { picked = value; } };
}

function seed(dir: string) {
	fs.mkdirSync(path.join(dir, "chats"), { recursive: true });
	fs.writeFileSync(path.join(dir, "chats", "c1.json"), '{"id":"c1"}');
	fs.writeFileSync(path.join(dir, "settings.json"), '{"version":1}');
}

describe("data-folder IPC", () => {
	it("get reports the folder; choose classifies the pick, including the current and nested folders", async () => {
		const userData = tmp("ipc-get");
		const dataDir = path.join(userData, "data");
		seed(dataDir);
		const f = ipcFixture(userData, dataDir);
		assert.deepEqual(await f.call("lh:data-folder:get"), { available: true, path: dataDir, isDefault: true, defaultPath: dataDir, defaultKind: "current" });
		f.pick(undefined);
		assert.deepEqual(await f.call("lh:data-folder:choose"), { canceled: true });
		const empty = tmp("ipc-empty");
		f.pick(empty);
		assert.deepEqual(await f.call("lh:data-folder:choose"), { canceled: false, path: empty, kind: "empty" });
		f.pick(dataDir);
		assert.equal(((await f.call("lh:data-folder:choose")) as { kind: string }).kind, "current");
		f.pick(path.join(dataDir, "chats"));
		assert.equal(((await f.call("lh:data-folder:choose")) as { kind: string }).kind, "nested");
	});

	it("move stops the server first, then copies, saves the choice, deletes the source and relaunches", async () => {
		const userData = tmp("ipc-move");
		const dataDir = path.join(userData, "data");
		seed(dataDir);
		const target = tmp("ipc-target");
		const f = ipcFixture(userData, dataDir);
		await f.call("lh:data-folder:apply", { path: target, mode: "move" });
		assert.deepEqual(f.events, ["stop:source-present", "relaunch", "exit"]);
		assert.equal(readLocation(userData).dataDir, target);
		assert.equal(fs.readFileSync(path.join(target, "chats", "c1.json"), "utf8"), '{"id":"c1"}');
		assert.equal(fs.existsSync(dataDir), false);
		assert.deepEqual(f.errors, []);
	});

	it("reset adopts a default that still holds data, and moves into a default that is gone", async () => {
		const userData = tmp("ipc-reset");
		const custom = tmp("ipc-custom");
		seed(custom);
		writeLocation(userData, custom);
		const f = ipcFixture(userData, custom);
		await f.call("lh:data-folder:apply", { reset: true });
		assert.equal(readLocation(userData).isDefault, true);
		assert.equal(fs.existsSync(path.join(userData, "data", "settings.json")), true);
		assert.equal(fs.existsSync(custom), false);

		const other = tmp("ipc-adopt");
		seed(other);
		seed(path.join(userData, "data"));
		writeLocation(userData, other);
		const g = ipcFixture(userData, other);
		await g.call("lh:data-folder:apply", { reset: true });
		assert.equal(readLocation(userData).isDefault, true);
		assert.equal(fs.existsSync(other), true, "adopting never deletes the folder being left");
	});

	it("refuses a mismatched or unusable target before touching the server", async () => {
		const userData = tmp("ipc-refuse");
		const dataDir = path.join(userData, "data");
		seed(dataDir);
		const occupied = tmp("ipc-occupied");
		fs.writeFileSync(path.join(occupied, "taxes.pdf"), "x");
		const holdsData = tmp("ipc-holds");
		seed(holdsData);
		const f = ipcFixture(userData, dataDir);
		await assert.rejects(Promise.resolve(f.call("lh:data-folder:apply", { path: occupied, mode: "move" })), /empty folder/);
		await assert.rejects(Promise.resolve(f.call("lh:data-folder:apply", { path: holdsData, mode: "move" })), /empty folder/);
		await assert.rejects(Promise.resolve(f.call("lh:data-folder:apply", { path: tmp("ipc-blank"), mode: "adopt" })), /empty folder/);
		await assert.rejects(Promise.resolve(f.call("lh:data-folder:apply", { path: dataDir, mode: "move" })), /already the data folder/);
		assert.deepEqual(f.events, []);

		const untrusted = ipcFixture(userData, dataDir, { trusted: false });
		await assert.rejects(Promise.resolve(untrusted.call("lh:data-folder:apply", { path: tmp("ipc-x"), mode: "move" })), /Untrusted/);
		const dev = ipcFixture(userData, dataDir, { available: false });
		assert.deepEqual(await dev.call("lh:data-folder:get"), { available: false });
		await assert.rejects(Promise.resolve(dev.call("lh:data-folder:choose")), /installed app/);
	});

	it("a failed move shows an error and relaunches on the old folder with its data intact", async () => {
		const userData = tmp("ipc-fail");
		const dataDir = path.join(userData, "data");
		seed(dataDir);
		fs.symlinkSync(path.join(dataDir, "settings.json"), path.join(dataDir, "link.json"));
		const target = tmp("ipc-fail-target");
		const f = ipcFixture(userData, dataDir);
		await f.call("lh:data-folder:apply", { path: target, mode: "move" });
		assert.deepEqual(f.events, ["stop:source-present", "relaunch", "exit"]);
		assert.equal(f.errors.length, 1);
		assert.match(f.errors[0]!, /only regular files and folders/);
		assert.equal(readLocation(userData).isDefault, true);
		assert.equal(fs.existsSync(path.join(dataDir, "chats", "c1.json")), true);
		assert.deepEqual(fs.readdirSync(target), []);
	});
});
