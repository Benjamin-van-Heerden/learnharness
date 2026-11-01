"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/components/activity-dock";
import { NotesImportErrors, NotesImportNotices, useNotesImport } from "@/components/notes-import.tsx";
import { SettingsRow } from "./controls.tsx";

/** FORK (UI rework): Import notes lives in Settings → Graph instead of
 *  upstream's floating NotesImportControl on the home screen and graph view.
 *  Same page-wide queue, so results survive closing Settings and more files
 *  can join a running import; two plain buttons replace the control's popover
 *  menu, which the scrolling dialog would clip. */
export function NotesImportRow() {
	const filesRef = useRef<HTMLInputElement>(null);
	const folderRef = useRef<HTMLInputElement>(null);
	const [done, setDone] = useState(false);
	// The import POST awaits the whole pipeline server-side, so the run
	// registers long before the response: nudge the activity dock at the
	// start and again at +600ms (the graph view's original rule).
	const refreshActivity = useActivity().refresh;
	const { importing, onImportFiles, errors, notices } = useNotesImport({
		onStart: () => {
			setDone(false);
			refreshActivity();
			setTimeout(() => refreshActivity(), 600);
		},
		onFinish: () => setDone(true),
	});
	const onChange = (event: ChangeEvent<HTMLInputElement>) => {
		onImportFiles(event.target.files);
		event.target.value = ""; // allow re-picking the same file
	};

	return (
		<>
			<SettingsRow label="Import notes" hint={importing ? "Importing…" : "Markdown, text or PDF files, extracted into your graph"} testid="graph-row-import-notes">
				<input ref={filesRef} type="file" multiple accept=".md,.markdown,.txt,.pdf" className="hidden" onChange={onChange} />
				<input ref={folderRef} type="file" {...{ webkitdirectory: "" }} className="hidden" onChange={onChange} />
				<span className="flex shrink-0 gap-2">
					<Button type="button" size="xs" variant="outline" className="cursor-pointer" data-testid="import-notes-files" onClick={() => filesRef.current?.click()}>Files…</Button>
					<Button type="button" size="xs" variant="outline" className="cursor-pointer" data-testid="import-notes-folder" onClick={() => folderRef.current?.click()}>Folder…</Button>
				</span>
			</SettingsRow>
			{done && !importing && errors.length === 0 && <p className="text-xs text-muted-foreground" data-testid="import-notes-done">Import finished.</p>}
			<NotesImportErrors errors={errors} />
			<NotesImportNotices notices={notices} />
		</>
	);
}
