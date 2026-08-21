//#region src/index.ts
const CAPACITY = 100;
const MAX_STRING = 2e5;
const ROUTE_PREFIX = "/__sseye";
const records = [];
const byId = /* @__PURE__ */ new Map();
const coordBySignal = /* @__PURE__ */ new Map();
let seq = 0;
const policy = {
	sources: {
		agent: true,
		compaction: true,
		title: true,
		other: true
	},
	fields: {
		system: true,
		messages: true,
		tools: true,
		reasoning: true,
		text: true,
		toolArgs: true
	},
	redactions: []
};
/** Canonical pi-ai Api ids → friendly labels. */
const API_LABELS = {
	"openai-completions": "OpenAI Chat Completions",
	"openai-responses": "OpenAI Responses",
	"azure-openai-responses": "Azure OpenAI Responses",
	"openai-codex-responses": "OpenAI Codex Responses",
	"anthropic-messages": "Anthropic Messages",
	"google-generative-ai": "Google Generative AI",
	"google-vertex": "Google Vertex AI",
	"mistral-conversations": "Mistral Conversations",
	"bedrock-converse-stream": "AWS Bedrock ConverseStream",
	"pi-messages": "Pi Messages",
	"ollama-chat": "Ollama /api/chat (NDJSON)"
};
/** Last-resort guesses for routes whose adapter exposes no configured protocol. */
const PROVIDER_API_FALLBACK = {
	"deepseek-official": "openai-completions",
	"newapi": "openai-completions",
	"ollama-cloud": "ollama-chat"
};
const apiCache = /* @__PURE__ */ new Map();
const API_CACHE_TTL = 6e4;
/**
* Truth source for the wire protocol: llm.listConfigurableProviders() gives
* each route's settings namespace + path; the profile object there carries
* the adapter's `api` (pi-ai KnownApi) and `baseURL`.
*/
function resolveRoute(svcs, provider) {
	const hit = apiCache.get(provider);
	if (hit && Date.now() - hit.at < API_CACHE_TTL) return hit;
	const out = { at: Date.now() };
	try {
		if (svcs.llm && svcs.settings) {
			const entries = svcs.llm.listConfigurableProviders();
			const entry = Array.isArray(entries) ? entries.find((e) => e && e.provider === provider) : void 0;
			if (entry) {
				let node = svcs.settings.get(entry.settingsNs);
				const path = Array.isArray(entry.settingsPath) ? entry.settingsPath : [];
				for (const p of path) if (node != null) node = node[p];
				if (node && typeof node === "object") {
					if (typeof node.api === "string" && node.api) out.api = node.api;
					if (typeof node.baseURL === "string" && node.baseURL) out.baseURL = node.baseURL;
				}
			}
		}
	} catch {}
	if (!out.api) {
		const fb = PROVIDER_API_FALLBACK[provider];
		if (fb) {
			out.api = fb;
			out.guessed = true;
		}
	}
	apiCache.set(provider, out);
	return out;
}
function protocolLabel(api) {
	return API_LABELS[api] || api;
}
function sourceOf(options) {
	if (options.purpose === "compaction") return "compaction";
	if (options.purpose === "session-title") return "title";
	if (options.sessionId !== void 0 && options.sessionId !== null) return "agent";
	return "other";
}
function capString(s) {
	if (typeof s !== "string") return s;
	if (s.length <= MAX_STRING) return s;
	return s.slice(0, MAX_STRING) + "\n…[truncated, total " + s.length + " chars]";
}
function redact(s) {
	if (typeof s !== "string" || policy.redactions.length === 0) return s;
	let out = s;
	for (const src of policy.redactions) try {
		out = out.replace(new RegExp(src, "g"), "***");
	} catch {}
	return out;
}
function cloneJson(v) {
	if (v === null || v === void 0) return v === void 0 ? null : v;
	if (typeof v === "number" || typeof v === "boolean") return v;
	if (typeof v === "string") return capString(redact(v));
	if (Array.isArray(v)) return v.map((x) => x === void 0 ? null : cloneJson(x));
	if (typeof v === "object") {
		if (v.type === "image") return {
			type: "image",
			omitted: true
		};
		const out = {};
		for (const k of Object.keys(v)) {
			const val = v[k];
			if (val === void 0 || typeof val === "function") continue;
			out[k] = cloneJson(val);
		}
		return out;
	}
	return String(v);
}
function copyRequest(options) {
	const req = {
		provider: options.provider,
		model: options.model
	};
	if (options.reasoningEffort !== void 0) req.reasoningEffort = String(options.reasoningEffort);
	if (options.temperature !== void 0) req.temperature = options.temperature;
	if (options.maxTokens !== void 0) req.maxTokens = options.maxTokens;
	if (options.stop !== void 0) req.stop = cloneJson(options.stop);
	if (typeof options.system === "string" && options.system.length > 0) {
		if (policy.fields.system) req.system = capString(redact(options.system));
		else req.systemOmitted = true;
	}
	const msgs = Array.isArray(options.messages) ? options.messages : [];
	req.messageCount = msgs.length;
	if (policy.fields.messages) req.messages = msgs.map((m) => cloneJson(m));
	else req.messagesOmitted = msgs.length;
	const tools = Array.isArray(options.tools) ? options.tools : [];
	req.toolCount = tools.length;
	if (policy.fields.tools) req.tools = tools.map((t) => cloneJson(t));
	else req.toolsOmitted = tools.length;
	return req;
}
function ensureBlock(rec, index, kind) {
	let b = rec.blocks.get(index);
	if (!b) {
		b = {
			index,
			kind,
			text: "",
			reasoning: "",
			toolName: "",
			toolId: "",
			args: "",
			chars: 0,
			startedAt: Date.now()
		};
		rec.blocks.set(index, b);
	}
	return b;
}
function observeChunk(rec, chunk) {
	try {
		if (!chunk || typeof chunk !== "object") return;
		const now = Date.now();
		if (rec.firstChunkAt === 0) rec.firstChunkAt = now;
		rec.chunkCount++;
		if (chunk.type === "block-start") {
			const b = ensureBlock(rec, chunk.index, typeof chunk.blockType === "string" ? chunk.blockType : "unknown");
			b.kind = typeof chunk.blockType === "string" ? chunk.blockType : b.kind;
		} else if (chunk.type === "text-delta") {
			const b = ensureBlock(rec, chunk.index, "text");
			const t = typeof chunk.text === "string" ? chunk.text : "";
			b.chars += t.length;
			if (policy.fields.text) b.text += redact(t);
		} else if (chunk.type === "reasoning-delta") {
			const b = ensureBlock(rec, chunk.index, "reasoning");
			const t = typeof chunk.text === "string" ? chunk.text : "";
			b.chars += t.length;
			if (policy.fields.reasoning) b.reasoning += redact(t);
		} else if (chunk.type === "tool-call-delta") {
			const b = ensureBlock(rec, chunk.index, "tool-call");
			if (typeof chunk.name === "string") b.toolName = chunk.name;
			if (chunk.id !== void 0) b.toolId = String(chunk.id);
			const t = typeof chunk.argumentsDelta === "string" ? chunk.argumentsDelta : "";
			b.chars += t.length;
			if (policy.fields.toolArgs) b.args += redact(t);
		} else if (chunk.type === "block-end") {
			const b = rec.blocks.get(chunk.index);
			if (b) b.endedAt = now;
		} else if (chunk.type === "usage") rec.usage = cloneJson(chunk.usage);
		else if (chunk.type === "finish") {
			rec.finishReason = cloneJson(chunk.reason);
			rec.status = "finished";
			rec.endedAt = now;
		}
	} catch {}
}
function push(rec) {
	records.push(rec);
	byId.set(rec.id, rec);
	while (records.length > CAPACITY) {
		const old = records.shift();
		byId.delete(old.id);
	}
}
function previewOf(rec) {
	const msgs = rec.request.messages;
	if (Array.isArray(msgs)) for (let i = msgs.length - 1; i >= 0; i--) {
		const m = msgs[i];
		if (m && m.role === "user") {
			const c = m.content;
			if (typeof c === "string" && c) return c.slice(0, 80);
			if (Array.isArray(c)) {
				for (const b of c) if (b && typeof b.text === "string" && b.text) return b.text.slice(0, 80);
			}
		}
	}
	return "";
}
function replyPreviewOf(rec) {
	for (const b of rec.blocks.values()) if (b.text) return b.text.slice(0, 80);
	for (const b of rec.blocks.values()) if (b.toolName) return "[tool] " + b.toolName;
	return "";
}
function summary(rec) {
	const out = {
		id: rec.id,
		startedAt: rec.startedAt,
		source: rec.source,
		provider: rec.request.provider,
		model: rec.request.model,
		status: rec.status,
		chunks: rec.chunkCount,
		messageCount: rec.request.messageCount,
		toolCount: rec.request.toolCount,
		preview: previewOf(rec),
		replyPreview: replyPreviewOf(rec)
	};
	if (rec.api !== void 0) {
		out.api = rec.api;
		out.protocol = protocolLabel(rec.api);
		if (rec.apiGuessed) out.protocolGuessed = true;
	}
	if (rec.baseURL !== void 0) out.baseURL = rec.baseURL;
	if (rec.sessionId !== void 0) out.sessionId = rec.sessionId;
	if (rec.turn !== void 0) out.turn = rec.turn;
	if (rec.step !== void 0) out.step = rec.step;
	if (rec.usage !== void 0) out.usage = rec.usage;
	if (rec.finishReason !== void 0) out.finishReason = rec.finishReason;
	if (rec.error !== void 0) out.error = rec.error;
	if (rec.firstChunkAt) out.ttftMs = rec.firstChunkAt - rec.startedAt;
	if (rec.endedAt) out.durationMs = rec.endedAt - rec.startedAt;
	return out;
}
function sharedPrefixCount(rec) {
	if (!rec.sessionId || !Array.isArray(rec.request.messages)) return 0;
	const idx = records.indexOf(rec);
	if (idx <= 0) return 0;
	const b = rec.request.messages;
	for (let i = idx - 1; i >= 0; i--) {
		const prev = records[i];
		if (prev.sessionId !== rec.sessionId || !Array.isArray(prev.request.messages)) continue;
		const a = prev.request.messages;
		let n = 0;
		const max = Math.min(a.length, b.length);
		while (n < max) {
			let sa, sb;
			try {
				sa = JSON.stringify(a[n]);
				sb = JSON.stringify(b[n]);
			} catch {
				break;
			}
			if (sa !== sb) break;
			n++;
		}
		return n;
	}
	return 0;
}
function wireOf(req) {
	const messages = [];
	if (typeof req.system === "string" && req.system) messages.push({
		role: "system",
		content: req.system
	});
	if (Array.isArray(req.messages)) for (const m of req.messages) messages.push(m);
	const out = {
		model: req.model,
		messages,
		stream: true,
		stream_options: { include_usage: true }
	};
	if (Array.isArray(req.tools) && req.tools.length > 0) out.tools = req.tools.map((t) => ({
		type: "function",
		function: {
			name: t && t.name,
			description: t && t.description,
			parameters: t && t.parameters
		}
	}));
	if (req.reasoningEffort !== void 0) out.reasoning_effort = req.reasoningEffort;
	if (req.temperature !== void 0) out.temperature = req.temperature;
	if (req.maxTokens !== void 0) out.max_tokens = req.maxTokens;
	if (req.stop !== void 0) out.stop = req.stop;
	return out;
}
function detail(rec) {
	const out = summary(rec);
	out.request = rec.request;
	out.wire = wireOf(rec.request);
	out.blocks = Array.from(rec.blocks.values()).sort((a, b) => a.index - b.index);
	out.sharedPrefix = sharedPrefixCount(rec);
	out.policyEcho = cloneJson(policy);
	return out;
}
function sendJson(res, value, status = 200) {
	try {
		const body = JSON.stringify(value === void 0 ? null : value);
		res.writeHead(status, {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store"
		});
		res.end(body);
	} catch {
		try {
			res.end();
		} catch {}
	}
}
function readBody(req, limit = 1048576) {
	return new Promise((resolveBody, reject) => {
		const parts = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > limit) {
				reject(/* @__PURE__ */ new Error("body too large"));
				req.destroy();
				return;
			}
			parts.push(chunk);
		});
		req.on("end", () => resolveBody(Buffer.concat(parts).toString("utf8")));
		req.on("error", reject);
	});
}
function applyPolicyPatch(args) {
	if (args && typeof args === "object") {
		if (args.sources && typeof args.sources === "object") {
			for (const k of Object.keys(policy.sources)) if (typeof args.sources[k] === "boolean") policy.sources[k] = args.sources[k];
		}
		if (args.fields && typeof args.fields === "object") {
			for (const k of Object.keys(policy.fields)) if (typeof args.fields[k] === "boolean") policy.fields[k] = args.fields[k];
		}
		if (Array.isArray(args.redactions)) policy.redactions = args.redactions.filter((s) => typeof s === "string" && s.length > 0);
	}
	return policy;
}
async function handleHttp(req, res) {
	try {
		const url = new URL(req.url || "/", "http://localhost");
		const sub = url.pathname.slice(8) || "/";
		if (req.method === "GET" && sub === "/list") {
			sendJson(res, records.slice().reverse().map(summary));
			return;
		}
		if (req.method === "GET" && sub === "/get") {
			const rec = byId.get(url.searchParams.get("id") || "");
			sendJson(res, rec ? detail(rec) : null);
			return;
		}
		if (req.method === "POST" && sub === "/clear") {
			records.length = 0;
			byId.clear();
			sendJson(res, null);
			return;
		}
		if (req.method === "GET" && sub === "/policy") {
			sendJson(res, cloneJson(policy));
			return;
		}
		if (req.method === "POST" && sub === "/policy") {
			const text = await readBody(req);
			let patch = null;
			try {
				patch = text ? JSON.parse(text) : null;
			} catch {}
			sendJson(res, cloneJson(applyPolicyPatch(patch)));
			return;
		}
		sendJson(res, { error: "not found" }, 404);
	} catch (e) {
		sendJson(res, { error: e instanceof Error ? e.message : String(e) }, 500);
	}
}
const name = "sseye";
function apply(ctx) {
	const svcs = {
		llm: ctx.get("llm"),
		settings: ctx.get("settings")
	};
	ctx.on("agent/request", (payload, next) => {
		try {
			if (payload && payload.signal) {
				if (coordBySignal.size > 200) coordBySignal.clear();
				coordBySignal.set(payload.signal, {
					turn: payload.turn,
					step: payload.step
				});
			}
		} catch {}
		return next();
	});
	ctx.on("llm/stream", (options, next) => {
		let source = "other";
		try {
			source = sourceOf(options);
		} catch {}
		if (!policy.sources[source]) return next();
		const id = "c" + ++seq;
		let coord;
		try {
			if (options.signal) {
				coord = coordBySignal.get(options.signal);
				coordBySignal.delete(options.signal);
			}
		} catch {}
		const rec = {
			id,
			startedAt: Date.now(),
			firstChunkAt: 0,
			endedAt: 0,
			status: "running",
			source,
			request: copyRequest(options),
			blocks: /* @__PURE__ */ new Map(),
			chunkCount: 0
		};
		if (options.sessionId !== void 0 && options.sessionId !== null) rec.sessionId = String(options.sessionId);
		if (coord) {
			rec.turn = coord.turn;
			rec.step = coord.step;
		}
		try {
			const route = resolveRoute(svcs, options.provider);
			if (route.api !== void 0) {
				rec.api = route.api;
				if (route.guessed) rec.apiGuessed = true;
			}
			if (route.baseURL !== void 0) rec.baseURL = route.baseURL;
		} catch {}
		let inner;
		try {
			inner = next();
		} catch (e) {
			rec.status = "error";
			rec.error = e instanceof Error ? e.message : String(e);
			rec.endedAt = Date.now();
			push(rec);
			throw e;
		}
		push(rec);
		return (async function* () {
			try {
				for await (const chunk of inner) {
					observeChunk(rec, chunk);
					yield chunk;
				}
				if (rec.status === "running") {
					rec.status = "finished";
					rec.endedAt = Date.now();
				}
			} catch (e) {
				rec.status = "error";
				rec.error = e instanceof Error ? e.message : String(e);
				rec.endedAt = Date.now();
				throw e;
			} finally {
				if (!rec.endedAt) rec.endedAt = Date.now();
			}
		})();
	});
	ctx.inject(["webServer"], (web) => {
		const webServer = web.get("webServer");
		web.effect(() => webServer.register({
			kind: "prefix",
			path: ROUTE_PREFIX,
			handler: handleHttp
		}), "sseye: http routes");
	});
	console.log("dsh-sseye: llm/stream capture active, capacity 100");
}
//#endregion
export { apply, name };
