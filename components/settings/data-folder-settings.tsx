"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsRow } from "./controls.tsx";

/** FORK: the choosable data folder (electron/data-folder.cjs). Desktop only:
 * renders nothing without the preload bridge or in the dev shell. */

export type DataFolderKind = "missing" | "empty" | "learnharness" | "other" | "current" | "nested";
export type DataFolderState =
	| { available: false }
	| { available: true; path: string; isDefault: boolean; defaultPath: string; defaultKind: DataFolderKind };
export type DataFolderBridge = {
	get: () => Promise<DataFolderState>;
	choose: () => Promise<{ canceled: true } | { canceled: false; path: string; kind: DataFolderKind }>;
	apply: (request: { path: string; mode: "move" | "adopt" } | { reset: true }) => Promise<void>;
};

export const DATA_FOLDER_HINT = "Use this folder on one Mac at a time. In iCloud Drive, set the folder to Keep Downloaded.";
const BUSY = "Wait for running sessions and background work to finish.";
const UNUSABLE = "This folder has other files in it. Choose an empty folder, or one that already holds LearnHarness data.";

type Plan =
	| { kind: "confirm"; text: string; action: string; request: { path: string; mode: "move" | "adopt" } | { reset: true } }
	| { kind: "refuse"; text: string };

/** What choosing a folder of `kind` at `path` offers; null means no change. */
export function planFor(kind: DataFolderKind, path: string, reset = false): Plan | null {
	const request = (mode: "move" | "adopt") => (reset ? { reset: true as const } : { path, mode });
	switch (kind) {
		case "current": return null;
		case "nested": return { kind: "refuse", text: "Choose a folder outside your current data folder." };
		case "other": return { kind: "refuse", text: UNUSABLE };
		case "learnharness": return { kind: "confirm", text: `${path} already has LearnHarness data. Switch to it? Your current data stays where it is.`, action: "Switch and restart", request: request("adopt") };
		// "missing" only reaches here for the default folder after a move away.
		case "empty": case "missing": return { kind: "confirm", text: `Move your data to ${path}? LearnHarness copies everything, checks it, deletes the old copy, and restarts.`, action: "Move and restart", request: request("move") };
	}
}

/** Keeps both ends of a long path visible; the full path rides in title. */
export function middleTruncate(path: string, max = 56): string {
	if (path.length <= max) return path;
	const head = Math.ceil((max - 1) / 2);
	return `${path.slice(0, head)}…${path.slice(path.length - (max - 1 - head))}`;
}

/** Best effort: apply also stops the server before touching any file. */
async function somethingRunning(): Promise<boolean> {
	const [chats, activity] = await Promise.all([
		fetch("/api/chats").then((res) => res.json() as Promise<{ chats: { busy?: boolean }[] }>),
		fetch("/api/activity").then((res) => res.json() as Promise<{ jobs: unknown[]; extractions: unknown[] }>),
	]);
	return chats.chats.some((chat) => chat.busy) || activity.jobs.length > 0 || activity.extractions.length > 0;
}

export function DataFolderSettings() {
	const [state, setState] = useState<DataFolderState | null>(null);
	const [plan, setPlan] = useState<Plan | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [applying, setApplying] = useState(false);

	useEffect(() => {
		const bridge = window.lh?.dataFolder;
		if (!bridge) return;
		let live = true;
		void bridge.get().then((next) => { if (live) setState(next); }).catch(() => { if (live) setState({ available: false }); });
		return () => { live = false; };
	}, []);

	if (!state?.available) return null;
	const bridge = window.lh?.dataFolder;

	const choose = async () => {
		setMessage(null);
		setPlan(null);
		try {
			const picked = await bridge?.choose();
			if (picked && !picked.canceled) setPlan(planFor(picked.kind, picked.path));
		} catch (err) {
			setMessage(err instanceof Error ? err.message : String(err));
		}
	};
	const useDefault = () => {
		setMessage(null);
		setPlan(planFor(state.defaultKind, state.defaultPath, true));
	};
	const apply = async (request: Extract<Plan, { kind: "confirm" }>["request"]) => {
		setMessage(null);
		try {
			if (await somethingRunning()) { setMessage(BUSY); return; }
		} catch {
			setMessage("Couldn’t check for running work. Try again.");
			return;
		}
		setApplying(true);
		// On success the app relaunches; this only resolves on a refusal.
		try { await bridge?.apply(request); }
		catch (err) { setMessage(err instanceof Error ? err.message : String(err)); }
		setApplying(false);
	};

	return (
		<>
			<SettingsRow
				label="Data folder"
				testid="row-data-folder"
				hint={
					<>
						<span className="block font-mono" title={state.path} data-testid="data-folder-path">{middleTruncate(state.path)}</span>
						<span className="block">{DATA_FOLDER_HINT}</span>
					</>
				}
			>
				<span className="flex shrink-0 gap-2">
					{!state.isDefault && (
						<Button type="button" size="xs" variant="outline" className="cursor-pointer" data-testid="data-folder-default" disabled={applying} onClick={useDefault}>Use default</Button>
					)}
					<Button type="button" size="xs" variant="outline" className="cursor-pointer" data-testid="data-folder-choose" disabled={applying} onClick={() => void choose()}>Choose…</Button>
				</span>
			</SettingsRow>
			{plan && (
				<div data-testid="data-folder-plan" className="flex items-center justify-between gap-4 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
					<span className="min-w-0 break-words">{plan.text}</span>
					{plan.kind === "confirm" && (
						<span className="flex shrink-0 gap-2">
							<Button type="button" size="xs" variant="outline" className="cursor-pointer" disabled={applying} onClick={() => setPlan(null)}>Cancel</Button>
							<Button type="button" size="xs" className="cursor-pointer" data-testid="data-folder-apply" disabled={applying} aria-busy={applying} onClick={() => void apply(plan.request)}>{plan.action}</Button>
						</span>
					)}
				</div>
			)}
			{message && <p role="alert" data-testid="data-folder-message" className="text-xs text-destructive">{message}</p>}
		</>
	);
}
