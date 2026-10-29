/**
 * FORK (UI rework): the titler names a session from its opening prompt
 * (src/server/session-title.ts). A model title replaces only the prompt's
 * truncation, never a hand rename; failures keep the prompt title. Runs under
 * an isolated LH_DATA_DIR, so every app-module import is dynamic.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";

const TMP_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "lh-session-title-"));
process.env.LH_DATA_DIR = TMP_DATA;

const { chatStore } = await import("../src/store/chats.ts");
const { subscribe } = await import("../src/core/events.ts");
const { sanitizeTitle, titleSession } = await import("../src/server/session-title.ts");
const { POST } = await import("../app/api/chats/route.ts");
type PiEngine = import("../src/agent/models.ts").PiEngine;

after(() => {
	fs.rmSync(TMP_DATA, { recursive: true, force: true });
});

const engine = {} as PiEngine;
const PROMPT = "I want to understand how Bayesian priors change the outcome of an A/B test when the sample is small";

describe("sanitizeTitle", () => {
	it("keeps the first line, drops a Title: label, quotes, markdown and trailing punctuation", () => {
		assert.equal(sanitizeTitle('Title: "Bayesian priors for A/B tests."\nBecause…'), "Bayesian priors for A/B tests");
		assert.equal(sanitizeTitle("**Small-sample A/B testing**"), "Small-sample A/B testing");
		assert.equal(sanitizeTitle("  \n\n  "), null);
		assert.equal(sanitizeTitle('"."'), null);
	});
});

describe("titleSession", () => {
	it("replaces the prompt title with the model's phrase and announces it", async () => {
		const chat = chatStore.createChat(PROMPT);
		const seen: string[] = [];
		const off = subscribe((e) => {
			if (e.type === "chat-titled") seen.push(`${e.chatId}:${(e as { title: string }).title}`);
		});
		let asked = "";
		await titleSession(chat.id, PROMPT, { chatStore, engine, write: async (prompt) => { asked = prompt; return "Bayesian priors in small A/B tests."; } });
		off();
		assert.equal(asked, PROMPT, "the titler sees the full prompt, not the truncated title");
		const record = chatStore.getChat(chat.id)!;
		assert.equal(record.title, "Bayesian priors in small A/B tests");
		assert.equal(record.titleSource, "model");
		assert.deepEqual(seen, [`${chat.id}:Bayesian priors in small A/B tests`]);
	});

	it("a rename that lands while the model is thinking wins", async () => {
		const chat = chatStore.createChat(PROMPT);
		let reply!: (text: string) => void;
		const pending = titleSession(chat.id, PROMPT, { chatStore, engine, write: () => new Promise((resolve) => { reply = resolve; }) });
		chatStore.renameChat(chat.id, "My priors notes", "user");
		reply("Bayesian priors in small A/B tests");
		await pending;
		const record = chatStore.getChat(chat.id)!;
		assert.equal(record.title, "My priors notes");
		assert.equal(record.titleSource, "user");
	});

	it("a provider error or an empty reply keeps the prompt title", async () => {
		const chat = chatStore.createChat(PROMPT);
		const before = chatStore.getChat(chat.id)!.title;
		await titleSession(chat.id, PROMPT, { chatStore, engine, write: async () => { throw new Error("429 rate limited"); } });
		await titleSession(chat.id, PROMPT, { chatStore, engine, write: async () => "   " });
		const record = chatStore.getChat(chat.id)!;
		assert.equal(record.title, before);
		assert.equal(record.titleSource, undefined);
	});
});

describe("POST /api/chats with no cheap model", () => {
	it("creates the session with the prompt title and never throws", async () => {
		const res = await POST(new Request("http://test/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: PROMPT }) }));
		assert.equal(res.status, 200);
		const { id, title } = (await res.json()) as { id: string; title: string };
		await new Promise((resolve) => setTimeout(resolve, 20));
		const record = chatStore.getChat(id)!;
		assert.equal(record.title, title);
		assert.equal(record.titleSource, undefined);
	});
});
