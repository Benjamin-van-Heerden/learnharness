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
