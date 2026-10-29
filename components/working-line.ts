import type { LhViewMessage } from "@/src/core";

/**
 * FORK (UI rework): the "Working…" line — a turn is running but nothing on
 * screen moves. That is the stretch after a tool settles or a step's message
 * ends and before the next message starts (provider connect, hidden thinking
 * before the first token). Everything else already animates: the THINKING…
 * placeholder (submitted / turnInFlight), a streaming message (text grows, an
 * empty one projects the thinking row), a reasoning row that is the last part,
 * and a tool card whose call has not finished executing (input-streaming).
 */
export function showWorkingLine({
	status,
	turnInFlight,
	compacting,
	messageStreaming,
	messages,
}: {
	status: string;
	turnInFlight: boolean;
	compacting: boolean;
	messageStreaming: boolean;
	messages: readonly LhViewMessage[];
}): boolean {
	if (status !== "streaming" || turnInFlight || compacting || messageStreaming) return false;
	const last = messages.at(-1);
	if (!last || last.role !== "assistant") return true;
	if (last.parts.at(-1)?.type === "reasoning") return false;
	return !last.parts.some((part) => part.type.startsWith("tool-") && part.state === "input-streaming");
}
