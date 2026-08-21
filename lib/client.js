window.__ModuleLoader__.load({
	id: "dsh-sseye",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		//#region src/client/styles.ts
		const CSS = "\n.sseye-hbtn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(127,137,150,.35));background:transparent;color:var(--dsw-alias-label-secondary,#9fb4c7);cursor:pointer;line-height:20px}\n.sseye-hbtn:hover{border-color:var(--dsw-alias-brand-primary,#4f8cff);color:var(--dsw-alias-brand-primary,#4f8cff)}\n.sseye-hbtn[data-active]{background:var(--dsw-alias-brand-primary,#4f8cff);border-color:var(--dsw-alias-brand-primary,#4f8cff);color:#fff}\n.sseye-hbtn svg{width:15px;height:15px}\n.sseye-panel{height:100%;display:flex;flex-direction:column;font-size:12px;background:var(--dsw-alias-bg-base,#14161a);color:var(--dsw-alias-label-primary,#d7dbe0);overflow:hidden}\n.sseye-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,#262b31);flex:none}\n.sseye-title{font-weight:600;font-size:13px}\n.sseye-count{color:var(--dsw-alias-label-secondary,#8b949e)}\n.sseye-spacer{flex:1}\n.sseye-btn{font:inherit;font-size:12px;padding:2px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2,rgba(127,137,150,.35));background:transparent;color:inherit;cursor:pointer}\n.sseye-btn:hover{border-color:var(--dsw-alias-brand-primary,#4f8cff);color:var(--dsw-alias-brand-primary,#4f8cff)}\n.sseye-btn[data-active]{border-color:var(--dsw-alias-brand-primary,#4f8cff);color:var(--dsw-alias-brand-primary,#4f8cff)}\n.sseye-body{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0}\n.sseye-listcol{flex:1;overflow-y:auto;min-height:0;padding:4px 0}\n.sseye-tgroup{margin:2px 8px 6px;border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.015))}\n.sseye-tgh{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;background:var(--dsw-alias-bg-layer-1,#171a1f);user-select:none}\n.sseye-tgh:hover{background:var(--dsw-alias-bg-layer-2,#1a1e24)}\n.sseye-tgh-title{font-weight:600;color:var(--dsw-alias-label-primary,#e6edf3);white-space:nowrap}\n.sseye-tgh-prev{color:var(--dsw-alias-label-secondary,#8b949e);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-style:italic}\n.sseye-tgh-agg{color:var(--dsw-alias-label-secondary,#8b949e);white-space:nowrap;font-variant-numeric:tabular-nums}\n.sseye-chev{font-size:14px;line-height:1;display:inline-block;transition:transform .15s;user-select:none;color:var(--dsw-alias-label-secondary,#8b949e);flex:none;font-style:normal}\n.sseye-chev.open{transform:rotate(90deg)}\n.sseye-steps{border-top:1px solid var(--dsw-alias-border-l2,#21262d)}\n.sseye-row{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 22px;border-bottom:1px solid var(--dsw-alias-border-l2,#1d2126);cursor:pointer;position:relative}\n.sseye-row:last-child{border-bottom:none}\n.sseye-row::before{content:\"\";position:absolute;left:10px;top:0;bottom:0;width:1px;background:var(--dsw-alias-border-l2,#2a2e33)}\n.sseye-row:hover{background:var(--dsw-alias-bg-layer-2,#1a1e24)}\n.sseye-row.sel{background:var(--dsw-alias-bg-layer-2,#1c2430)}\n.sseye-dot{width:7px;height:7px;border-radius:50%;flex:none}\n.sseye-stepchip{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9fb4c7);font-weight:600;white-space:nowrap;min-width:34px}\n.sseye-model{color:var(--dsw-alias-label-primary,#e6edf3);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}\n.sseye-dim{color:var(--dsw-alias-label-secondary,#8b949e);white-space:nowrap;font-variant-numeric:tabular-nums}\n.sseye-prev{color:var(--dsw-alias-label-secondary,#8b949e);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}\n.sseye-detail{flex:1.4;min-height:0;overflow-y:auto;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l2,#262b31)}\n.sseye-sec{margin-bottom:12px}\n.sseye-sec-title{font-weight:600;color:var(--dsw-alias-label-secondary,#9fb4c7);margin-bottom:4px;display:flex;align-items:center;gap:4px;cursor:pointer;list-style:none}\n.sseye-sec-title::-webkit-details-marker{display:none}\n.sseye-pre{background:var(--dsw-alias-bg-layer-1,#0d1117);border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:6px;padding:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word;max-height:320px;overflow-y:auto;margin:4px 0;line-height:1.55}\n.sseye-chip{display:inline-block;padding:0 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-2,#21262d);color:var(--dsw-alias-label-secondary,#9fb4c7);margin-right:6px;font-size:11px;line-height:18px}\n.sseye-reason{color:var(--dsw-alias-label-secondary,#8b949e);font-style:italic}\n.sseye-err{color:var(--dsw-alias-state-error-primary,#e5534b)}\n.sseye-policy{padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,#262b31);background:var(--dsw-alias-bg-layer-1,#171a1f);flex:none}\n.sseye-policy label{display:inline-flex;align-items:center;gap:4px;margin-right:10px;cursor:pointer;white-space:nowrap}\n.sseye-textarea{width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1,#0d1117);color:var(--dsw-alias-label-primary,#d7dbe0);border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:6px;font:inherit;font-size:11px;padding:6px;margin-top:6px}\n.sseye-empty{padding:24px;text-align:center;color:var(--dsw-alias-label-secondary,#8b949e)}\n.sseye-msg{margin-bottom:6px}\n.sseye-msg-new{border-left:2px solid var(--dsw-alias-brand-primary,#4f8cff);padding-left:8px}\n.sseye-shared{margin-bottom:6px}\n.sseye-shared summary{color:var(--dsw-alias-label-secondary,#8b949e);cursor:pointer;font-style:italic}\n.sseye-jkey{color:#4f9cff}\n.sseye-jstr{color:#3fb950}\n.sseye-jnum{color:#d29922}\n.sseye-jbool{color:#a371f7}\n.sseye-jp{color:var(--dsw-alias-label-secondary,#8b949e)}\n.sseye-copywrap{position:relative}\n.sseye-copy{position:absolute;top:4px;right:4px;width:22px;height:22px;display:none;align-items:center;justify-content:center;border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:5px;background:var(--dsw-alias-bg-base,#14161a);color:var(--dsw-alias-label-secondary,#8b949e);cursor:pointer;padding:0;z-index:2;opacity:.92}\n.sseye-copywrap:hover>.sseye-copy{display:inline-flex}\n.sseye-copy:hover{color:var(--dsw-alias-brand-primary,#4f8cff);border-color:var(--dsw-alias-brand-primary,#4f8cff)}\n.sseye-copy.ok{color:var(--dsw-alias-state-success-primary,#34c98e);border-color:var(--dsw-alias-state-success-primary,#34c98e);display:inline-flex}\n\n.sseye-hero{border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:10px;padding:10px 12px;margin-bottom:12px;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.015))}\n.sseye-hero-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.sseye-hero-model{font-weight:600;font-size:13px;color:var(--dsw-alias-label-primary,#e6edf3)}\n.sseye-hero-ep{margin-top:5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--dsw-alias-label-secondary,#8b949e);word-break:break-all}\n.sseye-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(76px,1fr));gap:1px;background:var(--dsw-alias-border-l2,#21262d);border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:8px;overflow:hidden;margin-top:10px}\n.sseye-stat{background:var(--dsw-alias-bg-base,#14161a);padding:6px 10px}\n.sseye-stat-l{font-size:10px;letter-spacing:.05em;color:var(--dsw-alias-label-secondary,#8b949e)}\n.sseye-stat-v{margin-top:2px;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e6edf3)}\n.sseye-cache{display:flex;align-items:center;gap:8px;margin-top:8px}\n.sseye-cache-track{flex:1;height:5px;border-radius:3px;background:var(--dsw-alias-bg-layer-2,#21262d);overflow:hidden}\n.sseye-cache-fill{height:100%;border-radius:3px;background:var(--dsw-alias-state-success-primary,#34c98e)}\n.sseye-cache-label{font-size:11px;color:var(--dsw-alias-label-secondary,#8b949e);font-variant-numeric:tabular-nums;white-space:nowrap}\n.sseye-chip-accent{border:1px solid var(--dsw-alias-brand-primary,#4f8cff);color:var(--dsw-alias-brand-primary,#4f8cff);background:transparent}\n.sseye-msg-head{display:flex;align-items:center;gap:8px;margin-bottom:3px}\n.sseye-role{font-weight:600;font-size:11px}\n.sseye-role-user{color:var(--dsw-alias-brand-primary,#4f8cff)}\n.sseye-role-assistant{color:var(--dsw-alias-state-success-primary,#34c98e)}\n.sseye-role-tool{color:var(--dsw-alias-state-warn-primary,#f0b429)}\n.sseye-role-system{color:var(--dsw-alias-label-secondary,#8b949e)}\n.sseye-bdot{display:inline-block;width:7px;height:7px;border-radius:2px;margin-right:2px}\n.sseye-dl{display:none;align-items:center;justify-content:center;width:20px;height:20px;border:none;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary,#8b949e);cursor:pointer;padding:0;flex:none}\n.sseye-row:hover .sseye-dl,.sseye-tgh:hover .sseye-dl{display:inline-flex}\n.sseye-dl:hover{color:var(--dsw-alias-brand-primary,#4f8cff);background:var(--dsw-alias-bg-layer-2,#1a1e24)}\n";
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-sseye — Client half (web composition module).
		*
		* DevTools-style viewer for the Host half's captures: a trigger button in
		* `conversation.session.header.utilities` plus the shell's right `details`
		* column (grid sibling of the conversation with a shell-owned draggable
		* divider). Talks to the Host over same-origin HTTP routes under
		* `/__sseye` (composition plugins have no package-private RPC).
		*
		* The bundle contract (single CJS file, ModuleLoader wrapper, platform
		* externals via the injected require) is owned by tsdown.config.ts.
		*/
		const h = react.createElement;
		const API_BASE = "/__sseye";
		async function api(path, body) {
			const init = body !== void 0 ? {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			} : { method: "GET" };
			const res = await fetch(API_BASE + path, init);
			if (!res.ok) throw new Error("HTTP " + res.status);
			return res.json();
		}
		/** Assigned in apply(); module-level because the components are module-level. */
		let layout;
		const store = {
			open: false,
			items: [],
			selectedId: null,
			detail: null,
			policy: null,
			showPolicy: false,
			openGroups: {},
			sessionId: null,
			onlyThisSession: true,
			listeners: /* @__PURE__ */ new Set(),
			emit() {
				for (const f of Array.from(this.listeners)) try {
					f();
				} catch {}
			}
		};
		function fmtTime(ts) {
			try {
				return new Date(ts).toLocaleTimeString();
			} catch {
				return "";
			}
		}
		function fmtDur(ms) {
			if (ms === void 0 || ms === null) return "";
			if (ms < 1e3) return ms + "ms";
			return (ms / 1e3).toFixed(1) + "s";
		}
		function usageText(u) {
			if (!u || typeof u !== "object") return "";
			const parts = [];
			for (const k of [
				"inputTokens",
				"outputTokens",
				"cacheReadTokens"
			]) if (typeof u[k] === "number") parts.push(k.replace("Tokens", "") + ":" + u[k]);
			return parts.join(" ");
		}
		function cap(s, n) {
			if (typeof s !== "string") return "";
			return s.length > n ? s.slice(0, n) + "\n…[截断，共 " + s.length + " 字符]" : s;
		}
		function tryParse(s) {
			if (typeof s !== "string") return { ok: false };
			try {
				return {
					ok: true,
					value: JSON.parse(s)
				};
			} catch {
				return { ok: false };
			}
		}
		function safeStringify(v) {
			try {
				return JSON.stringify(v, null, 2);
			} catch {
				return String(v);
			}
		}
		function copyText(text, done) {
			try {
				if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
					navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
					return;
				}
			} catch {}
			fallbackCopy(text, done);
		}
		function fallbackCopy(text, done) {
			try {
				const ta = document.createElement("textarea");
				ta.value = text;
				ta.style.position = "fixed";
				ta.style.opacity = "0";
				document.body.appendChild(ta);
				ta.select();
				document.execCommand("copy");
				ta.remove();
			} catch {}
			done();
		}
		function CopyIcon() {
			return h("svg", {
				viewBox: "0 0 24 24",
				width: 12,
				height: 12,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 2,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}, h("rect", {
				x: 9,
				y: 9,
				width: 12,
				height: 12,
				rx: 2
			}), h("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }));
		}
		function CheckIcon() {
			return h("svg", {
				viewBox: "0 0 24 24",
				width: 12,
				height: 12,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 2.5,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}, h("path", { d: "M20 6L9 17l-5-5" }));
		}
		function DownloadIcon() {
			return h("svg", {
				viewBox: "0 0 24 24",
				width: 12,
				height: 12,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 2,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}, h("path", { d: "M12 3v11" }), h("path", { d: "M7 10l5 5 5-5" }), h("path", { d: "M4 19h16" }));
		}
		function CopyWrap(props) {
			const [copied, setCopied] = react.useState(false);
			return h("div", { className: "sseye-copywrap" }, props.children, h("button", {
				className: "sseye-copy" + (copied ? " ok" : ""),
				title: "复制",
				onClick: (e) => {
					e.stopPropagation();
					copyText(props.text, () => {
						setCopied(true);
						setTimeout(() => setCopied(false), 1e3);
					});
				}
			}, copied ? h(CheckIcon) : h(CopyIcon)));
		}
		function copyablePre(text, cls) {
			return h(CopyWrap, { text }, h("pre", { className: cls }, text));
		}
		function copyableJson(value) {
			return h(CopyWrap, { text: safeStringify(value) }, h(JsonView, { value }));
		}
		function jp(s) {
			return h("span", { className: "sseye-jp" }, s);
		}
		function jsonNode(v, ind, key) {
			const padIn = "  ".repeat(ind + 1);
			const pad = "  ".repeat(ind);
			if (v === null || v === void 0) return h("span", {
				key,
				className: "sseye-jbool"
			}, "null");
			if (typeof v === "boolean") return h("span", {
				key,
				className: "sseye-jbool"
			}, String(v));
			if (typeof v === "number") return h("span", {
				key,
				className: "sseye-jnum"
			}, String(v));
			if (typeof v === "string") {
				const s = v.length > 4e3 ? v.slice(0, 4e3) + "…[+" + (v.length - 4e3) + " 字符]" : v;
				return h("span", {
					key,
					className: "sseye-jstr"
				}, "\"" + s + "\"");
			}
			if (Array.isArray(v)) {
				if (v.length === 0) return h("span", {
					key,
					className: "sseye-jp"
				}, "[]");
				const kids = [jp("[\n")];
				v.forEach((item, i) => {
					kids.push(h("span", { key: "i" + i }, [
						padIn,
						jsonNode(item, ind + 1, "v"),
						i < v.length - 1 ? ",\n" : "\n"
					]));
				});
				kids.push(jp(pad + "]"));
				return h("span", { key }, kids);
			}
			if (typeof v === "object") {
				const keys = Object.keys(v);
				if (keys.length === 0) return h("span", {
					key,
					className: "sseye-jp"
				}, "{}");
				const kids = [jp("{\n")];
				keys.forEach((k2, i) => {
					kids.push(h("span", { key: "k" + i }, [
						padIn,
						h("span", { className: "sseye-jkey" }, "\"" + k2 + "\""),
						jp(": "),
						jsonNode(v[k2], ind + 1, "v"),
						i < keys.length - 1 ? ",\n" : "\n"
					]));
				});
				kids.push(jp(pad + "}"));
				return h("span", { key }, kids);
			}
			return h("span", {
				key,
				className: "sseye-jp"
			}, String(v));
		}
		function JsonView(props) {
			return h("pre", { className: "sseye-pre" }, jsonNode(props.value, 0, "root"));
		}
		function BlockContent(props) {
			const b = props.b;
			if (!b || typeof b !== "object") return copyablePre(cap(String(b), 2e4), "sseye-pre");
			const t = b.type;
			if (t === "text" && typeof b.text === "string") return copyablePre(cap(b.text, 2e4), "sseye-pre");
			if (t === "reasoning") return copyablePre(cap(typeof b.reasoning === "string" ? b.reasoning : typeof b.text === "string" ? b.text : "", 2e4), "sseye-pre sseye-reason");
			if (t === "tool-call" || t === "tool_call") {
				const args = typeof b.arguments === "string" ? tryParse(b.arguments) : {
					ok: b.arguments !== void 0,
					value: b.arguments
				};
				return h("div", { className: "sseye-msg" }, h("span", { className: "sseye-chip" }, "tool-call " + (b.name || "")), args.ok ? copyableJson(args.value) : copyablePre(cap(String(b.arguments || ""), 2e4), "sseye-pre"));
			}
			if (t === "tool-result" || t === "tool_result" || t === "toolResult") {
				const kids = [h("div", { key: "h" }, h("span", { className: "sseye-chip" }, "tool-result" + (b.toolCallId ? " " + String(b.toolCallId) : "")), b.isError ? h("span", { className: "sseye-chip sseye-err" }, "error") : null)];
				if (Array.isArray(b.content)) for (let i = 0; i < b.content.length; i++) kids.push(h(BlockContent, {
					key: "c" + i,
					b: b.content[i]
				}));
				else if (b.content !== void 0) kids.push(h(CopyWrap, {
					key: "c",
					text: safeStringify(b.content)
				}, h(JsonView, { value: b.content })));
				return h("div", null, kids);
			}
			if (t === "image") return h("div", { className: "sseye-dim" }, "[image 已省略]");
			return copyableJson(b);
		}
		function logErr(where) {
			return (e) => {
				try {
					console.error("[sseye] " + where + " failed:", e && e.message ? e.message : String(e));
				} catch {}
			};
		}
		/**
		* Browser-native download through the host /export route: the route answers
		* with `content-disposition: attachment`, so a plain anchor click saves the
		* file — no Blob / URL.createObjectURL needed.
		*/
		function download(path) {
			try {
				const a = document.createElement("a");
				a.href = path;
				a.rel = "noopener";
				document.body.appendChild(a);
				a.click();
				a.remove();
			} catch (e) {
				logErr("download")(e);
			}
		}
		/** Download filename stem: turn/step coordinates when known, else source. */
		function exportNameOf(it) {
			const id = String(it && it.id ? it.id : "call");
			if (it && it.turn !== void 0 && it.turn !== null) return "T" + it.turn + (it.step !== void 0 && it.step !== null ? "-S" + it.step : "") + "-" + id;
			return String(it && it.source ? it.source : "call") + "-" + id;
		}
		function exportUrl(ids, name) {
			return "/__sseye/export?ids=" + encodeURIComponent(ids) + "&name=" + encodeURIComponent(name);
		}
		function pull() {
			api("/list").then((items) => {
				const arr = Array.isArray(items) ? items : [];
				let sig = String(arr.length);
				for (const it of arr) sig += "|" + it.id + ":" + it.status + ":" + it.chunks;
				if (sig !== lastSig) {
					lastSig = sig;
					store.items = arr;
					store.emit();
				}
			}).catch(logErr("list"));
			if (store.selectedId) {
				const cur = store.detail;
				if (!cur || cur.id !== store.selectedId || cur.status === "running") api("/get?id=" + encodeURIComponent(store.selectedId)).then((d) => {
					if (d && d.id === store.selectedId) {
						store.detail = d;
						store.emit();
					}
				}).catch(logErr("get"));
			}
		}
		let lastSig = "";
		function setPolicy(patch) {
			api("/policy", patch).then((p) => {
				if (p) store.policy = p;
				store.emit();
			}).catch(logErr("set-policy"));
		}
		function dot(status) {
			return h("span", {
				className: "sseye-dot",
				style: { background: status === "finished" ? "var(--dsw-alias-state-success-primary,#34c98e)" : status === "error" ? "var(--dsw-alias-state-error-primary,#e5534b)" : "var(--dsw-alias-state-warn-primary,#f0b429)" }
			});
		}
		function TriggerIcon(props) {
			const size = props && props.size ? props.size : 20;
			return h("svg", {
				viewBox: "0 0 24 24",
				width: size,
				height: size,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 1.8,
				strokeLinecap: "round"
			}, h("circle", {
				cx: 12,
				cy: 12,
				r: 2.1,
				fill: "currentColor",
				stroke: "none"
			}), h("circle", {
				cx: 12,
				cy: 12,
				r: 6
			}), h("circle", {
				cx: 12,
				cy: 12,
				r: 10
			}), h("path", { d: "M12 12 L19.5 6.5" }));
		}
		function Chevron(props) {
			return h("span", { className: "sseye-chev" + (props.open ? " open" : "") }, "›");
		}
		function groupItems(items) {
			const groups = [];
			const byKey = /* @__PURE__ */ new Map();
			for (const it of items) {
				let key, kind;
				if (it.turn !== void 0 && it.turn !== null) {
					key = "T:" + (it.sessionId || "?") + ":" + it.turn;
					kind = "turn";
				} else {
					key = "O:" + (it.source || "other") + ":" + (it.sessionId || "?");
					kind = "other";
				}
				let g = byKey.get(key);
				if (!g) {
					g = {
						key,
						kind,
						turn: it.turn,
						sessionId: it.sessionId,
						source: it.source,
						rows: [],
						latest: 0
					};
					byKey.set(key, g);
					groups.push(g);
				}
				g.rows.push(it);
				if (it.startedAt > g.latest) g.latest = it.startedAt;
			}
			groups.sort((a, b) => b.latest - a.latest);
			for (const g of groups) g.rows.sort((a, b) => a.startedAt - b.startedAt);
			return groups;
		}
		function StepRow(props) {
			const it = props.it;
			const cls = store.selectedId === it.id ? "sseye-row sel" : "sseye-row";
			const kids = [dot(it.status), h("span", {
				key: "s",
				className: "sseye-stepchip"
			}, it.step !== void 0 && it.step !== null ? "S" + it.step : it.source || "")];
			kids.push(h("span", {
				key: "t",
				className: "sseye-dim"
			}, fmtTime(it.startedAt)));
			kids.push(h("span", {
				key: "p",
				className: "sseye-prev"
			}, it.replyPreview || it.preview || ""));
			if (it.ttftMs !== void 0) kids.push(h("span", {
				key: "ttft",
				className: "sseye-dim"
			}, "TTFT " + fmtDur(it.ttftMs)));
			kids.push(h("span", {
				key: "d",
				className: "sseye-dim"
			}, fmtDur(it.durationMs)));
			if (it.usage) kids.push(h("span", {
				key: "u",
				className: "sseye-dim"
			}, usageText(it.usage)));
			kids.push(h("button", {
				key: "dl",
				className: "sseye-dl",
				title: "下载该调用（JSON）",
				onClick: (e) => {
					e.stopPropagation();
					download(exportUrl(it.id, exportNameOf(it)));
				}
			}, h(DownloadIcon)));
			return h("div", {
				className: cls,
				onClick: props.onSelect
			}, kids);
		}
		function TurnGroup(props) {
			const g = props.g;
			const isOpen = store.openGroups[g.key] !== false;
			let inTok = 0, outTok = 0, dur = 0, running = 0;
			for (const r of g.rows) {
				if (r.usage) {
					if (typeof r.usage.inputTokens === "number") inTok += r.usage.inputTokens;
					if (typeof r.usage.outputTokens === "number") outTok += r.usage.outputTokens;
				}
				if (r.durationMs) dur += r.durationMs;
				if (r.status === "running") running++;
			}
			const title = g.kind === "turn" ? "Turn " + g.turn : g.source === "compaction" ? "Compaction" : g.source === "title" ? "会话标题" : "其他调用";
			const prev = g.rows.length && g.rows[0].preview ? g.rows[0].preview : "";
			return h("div", { className: "sseye-tgroup" }, h("div", {
				className: "sseye-tgh",
				onClick: () => {
					store.openGroups[g.key] = !isOpen;
					store.emit();
				}
			}, h(Chevron, { open: isOpen }), h("span", { className: "sseye-tgh-title" }, title), h("span", { className: "sseye-chip" }, g.rows.length + " 次调用" + (running ? " · " + running + " 进行中" : "")), h("span", { className: "sseye-tgh-prev" }, prev), h("span", { className: "sseye-tgh-agg" }, "in:" + inTok + " out:" + outTok + " · " + fmtDur(dur)), h("button", {
				className: "sseye-dl",
				title: "下载本组全部调用（JSON）",
				onClick: (e) => {
					e.stopPropagation();
					download(exportUrl(g.rows.map((r) => r.id).join(","), g.kind === "turn" ? "turn-" + g.turn : String(g.source || "group")));
				}
			}, h(DownloadIcon))), isOpen ? h("div", { className: "sseye-steps" }, g.rows.map((it) => h(StepRow, {
				key: it.id,
				it,
				onSelect: () => {
					store.selectedId = it.id;
					store.detail = null;
					store.emit();
					api("/get?id=" + encodeURIComponent(it.id)).then((d) => {
						if (d) store.detail = d;
						store.emit();
					}).catch(logErr("get:select"));
				}
			}))) : null);
		}
		function Section(props) {
			const [open, setOpen] = react.useState(!!props.defaultOpen);
			return h("div", { className: "sseye-sec" }, h("div", {
				className: "sseye-sec-title",
				onClick: () => setOpen(!open)
			}, h(Chevron, { open }), props.title), open ? props.children : null);
		}
		function msgChars(m) {
			try {
				const c = m ? m.content : void 0;
				if (typeof c === "string") return c.length;
				if (c === void 0) return 0;
				return JSON.stringify(c).length;
			} catch {
				return 0;
			}
		}
		function MessageView(props) {
			const m = props.m;
			const role = m && typeof m.role === "string" ? m.role : "unknown";
			let body = null;
			const c = m ? m.content : void 0;
			if (typeof c === "string") body = copyablePre(cap(c, 2e4), "sseye-pre");
			else if (Array.isArray(c)) body = c.map((b, i) => h(BlockContent, {
				key: i,
				b
			}));
			else if (c !== void 0) body = copyableJson(c);
			else if (m && typeof m === "object") {
				const rest = {};
				let has = false;
				for (const k of Object.keys(m)) if (k !== "role") {
					rest[k] = m[k];
					has = true;
				}
				if (has) body = copyableJson(rest);
			}
			return h("div", { className: "sseye-msg" + (props.isNew ? " sseye-msg-new" : "") }, h("div", { className: "sseye-msg-head" }, h("span", { className: "sseye-role sseye-role-" + role }, role), h("span", { className: "sseye-dim" }, msgChars(m) + " 字符")), body);
		}
		const BLOCK_KIND_COLOR = {
			text: "var(--dsw-alias-brand-primary,#4f8cff)",
			reasoning: "#a371f7",
			"tool-call": "var(--dsw-alias-state-warn-primary,#f0b429)"
		};
		function BlockView(props) {
			const b = props.b;
			const label = "#" + b.index + " " + b.kind + (b.toolName ? " " + b.toolName : "") + " · " + b.chars + " chars";
			let body = null;
			if (b.kind === "reasoning" && b.reasoning) body = copyablePre(cap(b.reasoning, 2e4), "sseye-pre sseye-reason");
			else if (b.kind === "tool-call") {
				const args = tryParse(b.args);
				body = args.ok ? copyableJson(args.value) : copyablePre(cap(b.args, 2e4), "sseye-pre");
			} else if (b.text) body = copyablePre(cap(b.text, 2e4), "sseye-pre");
			const color = BLOCK_KIND_COLOR[b.kind] || "var(--dsw-alias-label-secondary,#8b949e)";
			return h("div", { className: "sseye-sec" }, h("div", { className: "sseye-sec-title" }, h("span", {
				className: "sseye-bdot",
				style: { background: color }
			}), label), body);
		}
		function Stat(props) {
			return h("div", { className: "sseye-stat" }, h("div", { className: "sseye-stat-l" }, props.label), h("div", { className: "sseye-stat-v" }, props.value));
		}
		function Hero(props) {
			const d = props.d;
			const req = d.request || {};
			const u = d.usage || {};
			const stats = [];
			if (d.ttftMs !== void 0) stats.push(h(Stat, {
				key: "ttft",
				label: "TTFT",
				value: fmtDur(d.ttftMs)
			}));
			if (d.durationMs !== void 0) stats.push(h(Stat, {
				key: "dur",
				label: "总时长",
				value: fmtDur(d.durationMs)
			}));
			stats.push(h(Stat, {
				key: "ch",
				label: "chunks",
				value: String(d.chunks)
			}));
			if (typeof u.inputTokens === "number") stats.push(h(Stat, {
				key: "in",
				label: "input",
				value: String(u.inputTokens)
			}));
			if (typeof u.outputTokens === "number") stats.push(h(Stat, {
				key: "out",
				label: "output",
				value: String(u.outputTokens)
			}));
			if (typeof u.cacheReadTokens === "number") stats.push(h(Stat, {
				key: "cr",
				label: "cache read",
				value: String(u.cacheReadTokens)
			}));
			let cacheBar = null;
			if (typeof u.cacheReadTokens === "number" && typeof u.inputTokens === "number" && u.inputTokens + u.cacheReadTokens > 0) {
				const ratio = u.cacheReadTokens / (u.inputTokens + u.cacheReadTokens);
				cacheBar = h("div", {
					className: "sseye-cache",
					title: "cacheReadTokens / (inputTokens + cacheReadTokens)"
				}, h("div", { className: "sseye-cache-track" }, h("div", {
					className: "sseye-cache-fill",
					style: { width: (ratio * 100).toFixed(1) + "%" }
				})), h("span", { className: "sseye-cache-label" }, "cache 命中 " + (ratio * 100).toFixed(1) + "%"));
			}
			return h("div", { className: "sseye-hero" }, h("div", { className: "sseye-hero-top" }, dot(d.status), h("span", { className: "sseye-hero-model" }, String(req.provider || "") + "/" + String(req.model || "")), d.protocol ? h("span", {
				className: "sseye-chip sseye-chip-accent",
				title: d.api ? d.api + (d.protocolGuessed ? "（按 provider 猜测）" : "（来自 provider 配置）") : void 0
			}, (d.protocolGuessed ? "~" : "") + d.protocol) : null, d.source ? h("span", { className: "sseye-chip" }, d.source) : null, d.turn !== void 0 && d.turn !== null ? h("span", { className: "sseye-chip" }, "T" + d.turn + " · S" + d.step) : null, h("span", { className: "sseye-spacer" }), h("button", {
				className: "sseye-btn",
				title: "下载该调用（JSON）",
				onClick: () => download(exportUrl(d.id, exportNameOf(d)))
			}, "下载"), h("span", { className: "sseye-dim" }, fmtTime(d.startedAt))), d.baseURL !== void 0 ? h("div", { className: "sseye-hero-ep" }, String(d.baseURL)) : null, h("div", { className: "sseye-stats" }, stats), cacheBar);
		}
		function Detail() {
			const d = store.detail;
			if (!d) return h("div", { className: "sseye-detail" }, h("div", { className: "sseye-empty" }, "加载中…"));
			const req = d.request || {};
			const kids = [];
			kids.push(h(Hero, {
				key: "hero",
				d
			}));
			if (d.error) kids.push(h("div", {
				key: "err",
				className: "sseye-sec"
			}, h("div", { className: "sseye-sec-title sseye-err" }, "错误"), copyablePre(String(d.error), "sseye-pre sseye-err")));
			const params = [];
			if (req.reasoningEffort !== void 0) params.push(h("span", {
				key: "ef",
				className: "sseye-chip"
			}, "effort " + String(req.reasoningEffort)));
			if (req.temperature !== void 0) params.push(h("span", {
				key: "tp",
				className: "sseye-chip"
			}, "temp " + String(req.temperature)));
			if (req.maxTokens !== void 0) params.push(h("span", {
				key: "mx",
				className: "sseye-chip"
			}, "max " + String(req.maxTokens)));
			if (params.length) kids.push(h("div", {
				key: "prm",
				className: "sseye-sec"
			}, params));
			if (d.usage) kids.push(h(Section, {
				key: "us",
				title: "Usage JSON"
			}, copyableJson(d.usage)));
			if (typeof req.system === "string" && req.system) kids.push(h(Section, {
				key: "sys",
				title: "System Prompt（" + req.system.length + " 字符）"
			}, copyablePre(cap(req.system, 3e4), "sseye-pre")));
			else if (req.systemOmitted) kids.push(h("div", {
				key: "sys",
				className: "sseye-sec"
			}, h("div", { className: "sseye-sec-title" }, "System Prompt（按策略未捕获）")));
			if (Array.isArray(req.messages)) {
				const shared = typeof d.sharedPrefix === "number" ? d.sharedPrefix : 0;
				const newCount = req.messages.length - shared;
				const DIRECT_TAIL = 30;
				const msgKids = [h("div", {
					key: "h",
					className: "sseye-sec-title"
				}, "Messages（共 " + req.messages.length + " 条" + (shared > 0 ? " · 与前序共享 " + shared + " 条" : "") + (shared > 0 ? " · 新增 " + newCount + " 条" : "") + "）")];
				if (shared > 0) msgKids.push(h(Section, {
					key: "shared",
					title: "与前一次调用共享的前 " + shared + " 条消息（点击展开）"
				}, req.messages.slice(0, shared).map((m, i) => h(MessageView, {
					key: i,
					m
				}))));
				const tail = req.messages.slice(shared);
				const folded = tail.length > DIRECT_TAIL ? tail.length - DIRECT_TAIL : 0;
				if (folded > 0) msgKids.push(h(Section, {
					key: "older",
					title: "更早的 " + folded + " 条消息（点击展开）"
				}, tail.slice(0, folded).map((m, i) => h(MessageView, {
					key: "o" + i,
					m
				}))));
				tail.slice(folded).forEach((m, i) => {
					msgKids.push(h(MessageView, {
						key: "n" + i,
						m,
						isNew: shared > 0 && folded === 0
					}));
				});
				kids.push(h("div", {
					key: "msgs",
					className: "sseye-sec"
				}, msgKids));
			} else if (req.messagesOmitted) kids.push(h("div", {
				key: "msgs",
				className: "sseye-sec"
			}, h("div", { className: "sseye-sec-title" }, "Messages（" + req.messagesOmitted + " 条，按策略未捕获）")));
			if (Array.isArray(req.tools)) {
				const names = req.tools.map((t) => t && t.name);
				kids.push(h(Section, {
					key: "tls",
					title: "Tools（" + req.tools.length + " 个）"
				}, copyableJson(names)));
			}
			if (d.wire && (!d.api || d.api === "openai-completions")) kids.push(h(Section, {
				key: "wire",
				title: "Wire JSON（重建，近似）"
			}, copyablePre(cap(safeStringify(d.wire), 4e4), "sseye-pre")));
			if (Array.isArray(d.blocks) && d.blocks.length > 0) kids.push(h("div", {
				key: "resp",
				className: "sseye-sec"
			}, h("div", { className: "sseye-sec-title" }, "响应 · " + d.blocks.length + " 个块"), d.blocks.map((b) => h(BlockView, {
				key: b.index,
				b
			}))));
			if (d.finishReason !== void 0) kids.push(h("div", {
				key: "fin",
				className: "sseye-sec"
			}, h("div", { className: "sseye-sec-title" }, "Finish"), copyableJson(d.finishReason)));
			return h("div", { className: "sseye-detail" }, kids);
		}
		function PolicyPanel() {
			const p = store.policy;
			if (!p) return null;
			return h("div", { className: "sseye-policy" }, h("div", null, "来源：", [
				["agent", "Agent 调用"],
				["compaction", "Compaction"],
				["title", "会话标题"],
				["other", "其他/重放"]
			].map((kv) => h("label", { key: kv[0] }, h("input", {
				type: "checkbox",
				checked: !!(p.sources && p.sources[kv[0]]),
				onChange: (e) => {
					const patch = { sources: {} };
					patch.sources[kv[0]] = e.target.checked;
					if (store.policy && store.policy.sources) store.policy.sources[kv[0]] = e.target.checked;
					setPolicy(patch);
				}
			}), kv[1]))), h("div", { style: { marginTop: "6px" } }, "字段：", [
				["system", "system"],
				["messages", "messages"],
				["tools", "tools"],
				["reasoning", "reasoning"],
				["text", "正文"],
				["toolArgs", "工具参数"]
			].map((kv) => h("label", { key: kv[0] }, h("input", {
				type: "checkbox",
				checked: !!(p.fields && p.fields[kv[0]]),
				onChange: (e) => {
					const patch = { fields: {} };
					patch.fields[kv[0]] = e.target.checked;
					if (store.policy && store.policy.fields) store.policy.fields[kv[0]] = e.target.checked;
					setPolicy(patch);
				}
			}), kv[1]))), h("textarea", {
				className: "sseye-textarea",
				rows: 2,
				placeholder: "脱敏正则，每行一条；命中替换为 ***（失焦生效）",
				defaultValue: (p.redactions || []).join("\n"),
				onBlur: (e) => {
					setPolicy({ redactions: String(e.target.value || "").split("\n").map((s) => s.trim()).filter(Boolean) });
				}
			}));
		}
		function Panel() {
			const [, force] = react.useState(0);
			react.useEffect(() => {
				const f = () => force((n) => n + 1);
				store.listeners.add(f);
				return () => {
					store.listeners.delete(f);
				};
			}, []);
			react.useEffect(() => {
				let dead = false;
				const tick = () => {
					if (!dead) pull();
				};
				tick();
				const timer = setInterval(tick, 1500);
				return () => {
					dead = true;
					clearInterval(timer);
				};
			}, []);
			const all = store.items;
			const items = store.onlyThisSession && store.sessionId ? all.filter((it) => it.sessionId === store.sessionId) : all;
			const groups = groupItems(items);
			return h("div", { className: "sseye-panel" }, h("div", { className: "sseye-head" }, h("span", { className: "sseye-title" }, "SSEye"), h("span", { className: "sseye-count" }, groups.length + " 轮 · " + items.length + " 次调用"), h("button", {
				className: "sseye-btn",
				"data-active": store.onlyThisSession ? "" : void 0,
				onClick: () => {
					store.onlyThisSession = !store.onlyThisSession;
					store.emit();
				}
			}, store.onlyThisSession ? "本会话" : "全部"), h("span", { className: "sseye-spacer" }), h("button", {
				className: "sseye-btn",
				onClick: () => {
					store.showPolicy = !store.showPolicy;
					if (store.showPolicy && !store.policy) api("/policy").then((p) => {
						if (p) store.policy = p;
						store.emit();
					}).catch(logErr("get-policy"));
					store.emit();
				}
			}, store.showPolicy ? "收起策略" : "抓取策略"), h("button", {
				className: "sseye-btn",
				onClick: () => {
					api("/clear", {}).then(() => {
						store.items = [];
						store.selectedId = null;
						store.detail = null;
						store.emit();
					}).catch(logErr("clear"));
				}
			}, "清空"), h("button", {
				className: "sseye-btn",
				onClick: () => {
					store.open = false;
					store.emit();
					if (layout) layout.closeDetails();
				}
			}, "关闭")), store.showPolicy ? h(PolicyPanel) : null, h("div", { className: "sseye-body" }, h("div", { className: "sseye-listcol" }, groups.length === 0 ? h("div", { className: "sseye-empty" }, "暂无捕获。发起一次对话或调用后此处出现记录。") : groups.map((g) => h(TurnGroup, {
				key: g.key,
				g
			}))), store.selectedId ? h(Detail) : null));
		}
		const name = "dsh-sseye";
		const inject = ["slots"];
		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0) return;
			layout = ctx.get("layout");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-sseye";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			}, "dsh-sseye: panel styles");
			slots.inject("conversation.session.header.utilities", () => slots.register({
				name: "conversation.session.header.utilities",
				id: "sseye-trigger",
				label: "SSEye"
			}, (props) => {
				if (props && props.sessionId) store.sessionId = String(props.sessionId);
				return h("button", {
					className: "sseye-hbtn",
					"data-active": store.open ? "" : void 0,
					title: "SSEye · LLM 调试台",
					onClick: () => {
						store.open = !store.open;
						store.emit();
						if (layout) {
							if (store.open) layout.openDetails();
							else layout.closeDetails();
						}
					}
				}, h(TriggerIcon, { size: 15 }), "SSEye");
			}));
			slots.inject("details", () => slots.register({
				name: "details",
				priority: -1
			}, (props) => {
				if (props && props.sessionId) store.sessionId = String(props.sessionId);
				return h(Panel);
			}));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map