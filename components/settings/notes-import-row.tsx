"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/components/activity-dock";
import { NotesImportErrors, useNotesImport } from "@/components/notes-import.tsx";
import { SettingsRow } from "./controls.tsx";

/** FORK (UI rework): Import notes lives in Settings → Graph instead of a
 *  floating button on the home screen and graph view. Same pipeline: the
 *  files go through extraction into the graph, and the activity dock shows
 *  the runs. */
export function NotesImportRow() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [done, setDone] = useState(false);
	// The import POST awaits the whole pipeline server-side, so the run
	// registers long before the response: nudge the activity dock at the
	// start and again at +600ms (the graph view's original rule).
	const refreshActivity = useActivity().refresh;
	const notesImport = useNotesImport({
		onStart: () => {
			setDone(false);
			refreshActivity();
			setTimeout(() => refreshActivity(), 600);
		},
		onFinish: () => setDone(true),
	});
	const { importing, onImportFiles, errors } = notesImport;

	return (
		<>
			<SettingsRow label="Import notes" hint="Markdown or text files, extracted into your graph" testid="graph-row-import-notes">
				<input
					ref={fileInputRef}
					type="file"
					multiple
					accept=".md,.markdown,.txt"
					className="hidden"
					onChange={(e) => {
						onImportFiles(e.target.files);
						e.target.value = ""; // allow re-picking the same file
					}}
				/>
				<Button
					type="button"
					size="xs"
					variant="outline"
					className="cursor-pointer"
					data-testid="import-notes"
					disabled={importing}
					onClick={() => fileInputRef.current?.click()}
				>
					{importing ? "Importing…" : "Choose files…"}
				</Button>
			</SettingsRow>
			{done && !importing && errors.length === 0 && <p className="text-xs text-muted-foreground" data-testid="import-notes-done">Import finished.</p>}
			<NotesImportErrors errors={errors} />
		</>
	);
}
