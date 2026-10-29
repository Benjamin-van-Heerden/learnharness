/**
 * FORK (UI rework): the titler names a session from its opening prompt.
 *
 * POST /api/chats creates the session with the truncated prompt as its title
 * (titleSource "prompt") and fires this in the background; it never blocks or
 * fails the create. The model's phrase replaces the title only while the title
 * is still the prompt's — a hand rename (titleSource "user") always wins, even
 * one that lands while the call is in flight. Every failure (no cheap model, a
 * provider error, an empty reply) leaves the prompt title in place.
 */

import { emit } from "../core/events.ts";
import { titleFromPrompt } from "../core/contracts.ts";
import type { ChatStore } from "../core/ports.ts";
import type { PiEngine } from "../agent/models.ts";
import { runSubagent } from "../agent/subagents/pi-run.ts";

const TITLER_SYSTEM_PROMPT =
	"You name tutoring sessions. Given the learner's opening message, reply with a 3 to 6 word noun phrase in sentence case naming what they want to learn. No quotes, no trailing punctuation, nothing else.";

/** The titler only needs the gist; a pasted document shouldn't buy a long call. */
const PROMPT_CAP = 4000;

/** prompt → the model's raw reply. Injectable for tests. */
export type TitleWriter = (prompt: string, engine: PiEngine) => Promise<string>;

async function subagentTitleWriter(prompt: string, engine: PiEngine): Promise<string> {
	const { text } = await runSubagent([], { role: "titler", engine, systemPrompt: TITLER_SYSTEM_PROMPT, prompt, maxTurns: 1 });
	return text;
}

/** The reply's first line without a "Title:" label, wrapping quotes or
 *  markdown, or trailing punctuation, capped like a prompt title. Null when
 *  nothing usable is left. */
export function sanitizeTitle(raw: string): string | null {
	const line = raw.split("\n").map((l) => l.trim()).find((l) => l) ?? "";
	const cleaned = line
		.replace(/^title\s*:\s*/i, "")
		.replace(/^["'`*_#\s]+/, "")
		.replace(/["'`*_.,;:!?\s]+$/, "")
		.replace(/\s+/g, " ");
	return cleaned ? titleFromPrompt(cleaned) : null;
}

export async function titleSession(
	chatId: string,
	prompt: string,
	deps: { chatStore: ChatStore; engine: PiEngine; write?: TitleWriter },
): Promise<void> {
	let title: string | null;
	try {
		title = sanitizeTitle(await (deps.write ?? subagentTitleWriter)(prompt.slice(0, PROMPT_CAP), deps.engine));
	} catch (err) {
		console.info(`[chat ${chatId}] session title skipped — ${err instanceof Error ? err.message : String(err)}`);
		return;
	}
	if (!title) return;
	const record = deps.chatStore.getChat(chatId);
	if (!record || (record.titleSource ?? "prompt") !== "prompt") return;
	deps.chatStore.renameChat(chatId, title, "model");
	emit("chat-titled", { chatId, title });
}
