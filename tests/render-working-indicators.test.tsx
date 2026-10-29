/** FORK (UI rework): the live ticks on the working indicators — a thinking
 *  row (often empty: models that hide their reasoning) and a running tool
 *  card count elapsed seconds; a settled thinking row shows no duration. */
import React, { act } from "react";
(globalThis as Record<string, unknown>).React = React;
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { createRoot, type Root } from "react-dom/client";
import { parseHTML } from "linkedom";
import { Reasoning, ReasoningTrigger } from "../components/ai-elements/reasoning.tsx";
import { LiveToolCard } from "../components/artifacts/live-tool-card.tsx";

const dom = parseHTML("<html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.document });
const roots: Root[] = [];
const q = (host: ParentNode, id: string) => host.querySelector<HTMLElement>(`[data-testid='${id}']`);

beforeEach(() => mock.timers.enable({ apis: ["setInterval", "Date"] }));
afterEach(async () => {
	for (const root of roots.splice(0)) await act(async () => root.unmount());
	mock.timers.reset();
});

async function mount(node: React.ReactNode) {
	const host = document.createElement("div");
	document.body.append(host);
	const root = createRoot(host);
	roots.push(root);
	await act(async () => root.render(node));
	return { host, rerender: (next: React.ReactNode) => act(async () => root.render(next)) };
}

const tick = (ms: number) => act(async () => mock.timers.tick(ms));

describe("working indicator ticks", () => {
	it("a streaming thinking row counts seconds; once settled the count is gone", async () => {
		const row = (streaming: boolean) => (
			<Reasoning isStreaming={streaming}>
				<ReasoningTrigger />
			</Reasoning>
		);
		const { host, rerender } = await mount(row(true));
		assert.equal(q(host, "thinking-elapsed"), null, "no 0s flash on the first frame");
		await tick(3000);
		assert.equal(q(host, "thinking-elapsed")?.textContent, "3s");
		await rerender(row(false));
		assert.equal(q(host, "thinking-elapsed"), null);
		assert.match(host.textContent ?? "", /AGENT’S THINKING/);
	});

	it("a live tool card counts seconds while its call runs", async () => {
		const part = { type: "tool-read", toolCallId: "c1", state: "input-streaming", input: { path: "notes.md" } };
		const { host } = await mount(<LiveToolCard part={part as never} />);
		await tick(2000);
		assert.equal(q(host, "live-tool-elapsed")?.textContent, "2s");
	});
});
