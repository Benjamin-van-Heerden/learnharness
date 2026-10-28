/** FORK: the choosable data folder module (electron/data-location.cjs) —
 * where the choice is stored, how a folder is classified, and that a move
 * never loses data: verify before delete, clean up on failure. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { readLocation, writeLocation, classifyFolder, copyVerified, moveData, LOCATION_FILE } = require("../electron/data-location.cjs");

const tmp = (label: string) => fs.mkdtempSync(path.join(os.tmpdir(), `lh-data-location-${label}-`));

/** A small data folder shaped like the real one. */
function seedData(dir: string) {
	fs.mkdirSync(path.join(dir, "chats"), { recursive: true });
	fs.mkdirSync(path.join(dir, "graph", "nested"), { recursive: true });
	fs.writeFileSync(path.join(dir, "chats", "c1.json"), JSON.stringify({ id: "c1", messages: ["hello"] }));
	fs.writeFileSync(path.join(dir, "graph", "nodes.jsonl"), '{"id":"n1"}\n{"id":"n2"}\n');
	fs.writeFileSync(path.join(dir, "graph", "nested", "deep.json"), "{}");
	fs.writeFileSync(path.join(dir, "settings.json"), '{"version":1}');
}

function tree(dir: string): Record<string, string> {
	const out: Record<string, string> = {};
	const visit = (rel: string) => {
		for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
			const child = path.join(rel, entry.name);
			if (entry.isDirectory()) visit(child);
			else out[child] = fs.readFileSync(path.join(dir, child), "utf8");
		}
	};
	visit("");
	return out;
}

describe("location file", () => {
	it("defaults to <userData>/data when no choice is saved, and round-trips a choice", () => {
		const userData = tmp("loc");
		assert.deepEqual(readLocation(userData), { dataDir: path.join(userData, "data"), isDefault: true });
		writeLocation(userData, "/Volumes/Cloud/Learning");
		assert.deepEqual(readLocation(userData), { dataDir: "/Volumes/Cloud/Learning", isDefault: false });
		writeLocation(userData, null);
		assert.equal(fs.existsSync(path.join(userData, LOCATION_FILE)), false);
		assert.equal(readLocation(userData).isDefault, true);
	});

	it("a corrupt or relative setting is an error, never a silent fallback to the default", () => {
		const userData = tmp("corrupt");
		fs.writeFileSync(path.join(userData, LOCATION_FILE), "{not json");
		assert.throws(() => readLocation(userData), /corrupt/);
		fs.writeFileSync(path.join(userData, LOCATION_FILE), JSON.stringify({ dataDir: "relative/path" }));
		assert.throws(() => readLocation(userData), /corrupt/);
	});
});

describe("classifyFolder", () => {
	it("tells missing, empty (Finder clutter included), LearnHarness data and other folders apart", () => {
		const root = tmp("classify");
		assert.equal(classifyFolder(path.join(root, "nope")), "missing");
		fs.writeFileSync(path.join(root, "a-file"), "x");
		assert.equal(classifyFolder(path.join(root, "a-file")), "missing");

		const empty = path.join(root, "empty");
		fs.mkdirSync(empty);
		fs.writeFileSync(path.join(empty, ".DS_Store"), "");
		fs.writeFileSync(path.join(empty, "Icon\r"), "");
		assert.equal(classifyFolder(empty), "empty");

		const data = path.join(root, "data");
		fs.mkdirSync(path.join(data, "graph"), { recursive: true });
		assert.equal(classifyFolder(data), "learnharness");

		const other = path.join(root, "other");
		fs.mkdirSync(other);
		fs.writeFileSync(path.join(other, "taxes.pdf"), "x");
		assert.equal(classifyFolder(other), "other");
	});
});

describe("copyVerified and moveData", () => {
	it("moves a nested tree intact and deletes the source only afterwards", async () => {
		const root = tmp("move");
		const src = path.join(root, "data");
		const dst = path.join(root, "iCloud", "Learning");
		seedData(src);
		const before = tree(src);
		let sourceAtSave: boolean | null = null;
		await moveData(src, dst, { beforeDelete: () => { sourceAtSave = fs.existsSync(src); } });
		assert.deepEqual(tree(dst), before);
		assert.equal(sourceAtSave, true, "the location is saved while the source still exists");
		assert.equal(fs.existsSync(src), false);
	});

	it("a copy that fails verification removes what it created and leaves the source untouched", async () => {
		const root = tmp("corrupt-copy");
		const src = path.join(root, "data");
		const dst = path.join(root, "target");
		seedData(src);
		fs.mkdirSync(dst);
		const before = tree(src);
		const corrupting = async (from: string, to: string, mode: number) => {
			await fsp.copyFile(from, to, mode);
			if (to.endsWith("nodes.jsonl")) await fsp.writeFile(to, '{"id":"n1"}\n{"id":"nX"}\n');
		};
		await assert.rejects(moveData(src, dst, { copyFile: corrupting }), /Verification failed for graph[/\\]nodes\.jsonl/);
		assert.deepEqual(tree(src), before);
		assert.deepEqual(fs.readdirSync(dst), []);
	});

	it("refuses symlinks, non-empty destinations, and folders inside one another", async () => {
		const root = tmp("refuse");
		const src = path.join(root, "data");
		seedData(src);

		const occupied = path.join(root, "occupied");
		fs.mkdirSync(occupied);
		fs.writeFileSync(path.join(occupied, "notes.txt"), "x");
		await assert.rejects(copyVerified(src, occupied), /must be empty/);

		await assert.rejects(copyVerified(src, src), /current one/);
		await assert.rejects(copyVerified(src, path.join(src, "inner")), /outside your current data folder/);
		await assert.rejects(copyVerified(src, root), /outside your current data folder/);

		fs.symlinkSync(path.join(src, "settings.json"), path.join(src, "link.json"));
		await assert.rejects(copyVerified(src, path.join(root, "fresh")), /only regular files and folders/);
		assert.equal(fs.existsSync(path.join(src, "settings.json")), true);
	});
});
