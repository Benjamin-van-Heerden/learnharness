"use strict";
/*
 * FORK: the Electron side of the choosable data folder. main.cjs injects
 * its Electron objects and server control so this file holds the flow and
 * main.cjs stays a few lines different from upstream.
 *
 *   resolveAtStartup — the data folder for this launch. A chosen folder
 *     that is missing (iCloud still syncing, drive unplugged) or a corrupt
 *     setting stops here with Try Again / Choose Another Folder… / Quit;
 *     it never falls back to the default (owner decision 2026-10-28).
 *   registerDataFolderIPC — lh:data-folder:get / :choose / :apply for
 *     Settings → General. Apply validates, stops the server, moves (verified
 *     copy, then delete) or adopts, saves the choice and relaunches the app.
 */
const path = require("node:path");
const { defaultDataDir, readLocation, writeLocation, classifyFolder, checkPaths, moveData } = require("./data-location.cjs");

const UNUSABLE = "Choose an empty folder, or one that already holds LearnHarness data.";

/** Returns the data folder to use, or null when the user chose Quit. */
function resolveAtStartup({ userData, dialog }) {
	for (;;) {
		let problem;
		try {
			const location = readLocation(userData);
			if (location.isDefault || classifyFolder(location.dataDir) !== "missing") return location.dataDir;
			problem = `The data folder ${location.dataDir} could not be found. If it is in iCloud Drive it may still be syncing; if it is on an external drive, connect it.`;
		} catch (err) {
			problem = err.message;
		}
		const choice = dialog.showMessageBoxSync({
			type: "warning",
			message: "LearnHarness can't open its data folder",
			detail: problem,
			buttons: ["Try Again", "Choose Another Folder…", "Quit"],
			defaultId: 0,
			cancelId: 2,
		});
		if (choice === 2) return null;
		if (choice !== 1) continue;
		const picked = dialog.showOpenDialogSync({ title: "Choose the LearnHarness data folder", properties: ["openDirectory", "createDirectory"] })?.[0];
		if (!picked) continue;
		const kind = classifyFolder(picked);
		if (kind === "empty" || kind === "learnharness") writeLocation(userData, picked);
		else dialog.showMessageBoxSync({ type: "warning", message: "That folder can't be used", detail: UNUSABLE, buttons: ["OK"] });
	}
}

/** What choosing `target` would mean while `current` is in use. */
function kindOf(current, target) {
	if (path.resolve(current) === path.resolve(target)) return "current";
	try { checkPaths(current, target); } catch { return "nested"; }
	return classifyFolder(target);
}

/**
 * deps: ipcMain, dialog, app, BrowserWindow, userData, available (false in
 * the dev shell), getDataDir(), isTrusted(event), stopServer() → Promise
 * resolved once the server child has exited, log(line).
 */
function registerDataFolderIPC(deps) {
	const { ipcMain, dialog, app, BrowserWindow, userData, available, getDataDir, isTrusted, stopServer, log } = deps;
	const guard = (event) => {
		if (!isTrusted(event)) throw new Error("Untrusted desktop request.");
		if (!available) throw new Error("The data folder can only be changed in the installed app.");
	};

	ipcMain.handle("lh:data-folder:get", (event) => {
		if (!isTrusted(event)) throw new Error("Untrusted desktop request.");
		if (!available) return { available: false };
		const current = getDataDir();
		return { available: true, path: current, isDefault: path.resolve(current) === defaultDataDir(userData), defaultPath: defaultDataDir(userData) };
	});

	ipcMain.handle("lh:data-folder:choose", async (event) => {
		guard(event);
		const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
		const result = await dialog.showOpenDialog(win, { title: "Choose a folder for your LearnHarness data", properties: ["openDirectory", "createDirectory"] });
		const picked = result.filePaths?.[0];
		if (result.canceled || !picked) return { canceled: true };
		return { canceled: false, path: picked, kind: kindOf(getDataDir(), picked) };
	});

	ipcMain.handle("lh:data-folder:apply", async (event, request) => {
		guard(event);
		const current = getDataDir();
		const reset = request?.reset === true;
		const target = reset ? defaultDataDir(userData) : request?.path;
		if (typeof target !== "string" || !path.isAbsolute(target)) throw new Error("No folder was chosen.");
		const kind = kindOf(current, target);
		if (kind === "current") throw new Error("That is already the data folder.");
		if (kind === "nested") throw new Error("Choose a folder outside your current data folder.");
		// Reset decides for itself: an empty (or deleted) default receives a
		// move, a default still holding data is adopted.
		const mode = reset ? (kind === "learnharness" ? "adopt" : "move") : request?.mode;
		const ok = (mode === "move" && (kind === "empty" || (reset && kind === "missing"))) || (mode === "adopt" && kind === "learnharness");
		if (!ok) throw new Error(UNUSABLE);

		log(`data folder: ${mode} ${current} → ${target}`);
		await stopServer();
		try {
			const save = () => writeLocation(userData, reset ? null : target);
			// A data folder that was never written has nothing to move.
			if (mode === "move" && classifyFolder(current) !== "missing") await moveData(current, target, { beforeDelete: save });
			else save();
			log(`data folder: now ${target}`);
		} catch (err) {
			// The location is saved only after a verified copy and the source is
			// deleted only after that: a failure relaunches on the old folder with
			// its data intact (or, if only the delete failed, on the new one).
			log(`data folder: change failed — ${err?.message ?? err}`);
			dialog.showErrorBox("The data folder could not be changed", `${err?.message ?? err}\n\nLearnHarness will reopen with the folder now in use: ${readLocation(userData).dataDir}`);
		}
		app.relaunch();
		app.exit(0);
	});
}

module.exports = { resolveAtStartup, registerDataFolderIPC, kindOf };
