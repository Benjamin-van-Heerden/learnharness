"use strict";
/*
 * FORK: the choosable data folder (docs/fork-workflow.md). Plain Node, no
 * Electron, so it is unit-tested directly (tests/data-location.test.ts).
 *
 * The choice lives in <userData>/data-location.json as { dataDir }; no file
 * means the default <userData>/data. Only the data folder moves: secrets and
 * logs stay in userData (electron/main.cjs). A move copies, verifies every
 * file (size + SHA-256), and only then deletes the source.
 */
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");

const LOCATION_FILE = "data-location.json";
const MARKERS = ["chats", "graph", "settings.json"];
const FINDER_CLUTTER = new Set([".DS_Store", ".localized", "Icon\r"]);

const defaultDataDir = (userData) => path.join(userData, "data");

/** The resolved data folder. A corrupt location file throws: silently
 *  falling back would split the user's data across two folders. */
function readLocation(userData) {
	const file = path.join(userData, LOCATION_FILE);
	let raw;
	try {
		raw = fs.readFileSync(file, "utf8");
	} catch (err) {
		if (err.code === "ENOENT") return { dataDir: defaultDataDir(userData), isDefault: true };
		throw new Error(`The data folder setting (${file}) could not be read: ${err.message}`);
	}
	let parsed;
	try { parsed = JSON.parse(raw); } catch { parsed = null; }
	const dataDir = parsed?.dataDir;
	if (parsed === null || typeof parsed !== "object" || (dataDir !== undefined && (typeof dataDir !== "string" || !path.isAbsolute(dataDir)))) {
		throw new Error(`The data folder setting (${file}) is corrupt.`);
	}
	if (dataDir === undefined) return { dataDir: defaultDataDir(userData), isDefault: true };
	return { dataDir: path.resolve(dataDir), isDefault: path.resolve(dataDir) === defaultDataDir(userData) };
}

/** Saves the choice atomically; null (or the default path) removes it. */
function writeLocation(userData, dataDir) {
	const file = path.join(userData, LOCATION_FILE);
	if (dataDir === null || path.resolve(dataDir) === defaultDataDir(userData)) {
		fs.rmSync(file, { force: true });
		return;
	}
	const tmp = `${file}.${process.pid}.tmp`;
	fs.writeFileSync(tmp, `${JSON.stringify({ dataDir: path.resolve(dataDir) }, null, "\t")}\n`, "utf8");
	fs.renameSync(tmp, file);
}

/** "missing" | "empty" | "learnharness" | "other". Finder clutter is empty. */
function classifyFolder(dir) {
	let entries;
	try {
		if (!fs.statSync(dir).isDirectory()) return "missing";
		entries = fs.readdirSync(dir);
	} catch {
		return "missing";
	}
	const real = entries.filter((name) => !FINDER_CLUTTER.has(name));
	if (real.length === 0) return "empty";
	if (real.some((name) => MARKERS.includes(name))) return "learnharness";
	return "other";
}

const inside = (child, parent) => {
	const rel = path.relative(parent, child);
	return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

/** Refuses a destination that is, contains, or sits inside the source. */
function checkPaths(src, dst) {
	const a = path.resolve(src);
	const b = path.resolve(dst);
	if (a === b) throw new Error("The new data folder is the current one.");
	if (inside(a, b) || inside(b, a)) throw new Error("Choose a folder outside your current data folder.");
}

async function sha256(file) {
	return createHash("sha256").update(await fsp.readFile(file)).digest("hex");
}

/** Every regular file under root, relative, with directories listed first. */
async function walk(root, rel = "", out = { dirs: [], files: [] }) {
	for (const entry of await fsp.readdir(path.join(root, rel), { withFileTypes: true })) {
		const child = path.join(rel, entry.name);
		if (entry.isDirectory()) {
			out.dirs.push(child);
			await walk(root, child, out);
		} else if (entry.isFile()) {
			out.files.push(child);
		} else {
			throw new Error(`Cannot move ${path.join(root, child)}: only regular files and folders can be moved.`);
		}
	}
	return out;
}

/** Copies src into the empty dst and verifies each file. On any failure it
 *  removes what it created in dst and rethrows; src is never modified.
 *  `copyFile` is injectable so tests can corrupt a copy. */
async function copyVerified(src, dst, { copyFile = fsp.copyFile } = {}) {
	checkPaths(src, dst);
	const kind = classifyFolder(dst);
	if (kind !== "empty" && kind !== "missing") throw new Error("The new data folder must be empty.");
	const { dirs, files } = await walk(src);
	const created = [];
	try {
		await fsp.mkdir(dst, { recursive: true });
		for (const dir of dirs) {
			await fsp.mkdir(path.join(dst, dir));
			created.push(dir);
		}
		for (const file of files) {
			await copyFile(path.join(src, file), path.join(dst, file), fs.constants.COPYFILE_EXCL);
			created.push(file);
		}
		for (const file of files) {
			const [a, b] = await Promise.all([fsp.stat(path.join(src, file)), fsp.stat(path.join(dst, file))]);
			if (a.size !== b.size || (await sha256(path.join(src, file))) !== (await sha256(path.join(dst, file)))) {
				throw new Error(`Verification failed for ${file}: the copy does not match the original.`);
			}
		}
	} catch (err) {
		// Deepest first, so each directory is empty by the time it is removed.
		for (const rel of created.reverse()) await fsp.rm(path.join(dst, rel), { recursive: true, force: true });
		throw err;
	}
}

/** copyVerified, then delete the source (owner decision: no backup copy). */
async function moveData(src, dst, options) {
	await copyVerified(src, dst, options);
	await fsp.rm(src, { recursive: true, force: true });
}

module.exports = { LOCATION_FILE, defaultDataDir, readLocation, writeLocation, classifyFolder, checkPaths, copyVerified, moveData };
