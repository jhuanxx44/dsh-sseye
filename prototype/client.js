return {
  inject: ['timer'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return
    const h = React.createElement

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
      listeners: new Set(),
      emit() {
        for (const f of Array.from(this.listeners)) { try { f() } catch (e) {} }
      },
    }

    styles.insert('\n.sseye-hbtn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(127,137,150,.35));background:transparent;color:var(--dsw-alias-label-secondary,#9fb4c7);cursor:pointer;line-height:20px}\n.sseye-hbtn:hover{border-color:var(--dsw-alias-brand-primary,#4f8cff);color:var(--dsw-alias-brand-primary,#4f8cff)}\n.sseye-hbtn[data-active]{background:var(--dsw-alias-brand-primary,#4f8cff);border-color:var(--dsw-alias-brand-primary,#4f8cff);color:#fff}\n.sseye-hbtn svg{width:15px;height:15px}\n.sseye-panel{position:fixed;top:0;right:0;bottom:0;width:660px;max-width:94vw;background:var(--dsw-alias-bg-base,#14161a);color:var(--dsw-alias-label-primary,#d7dbe0);border-left:1px solid var(--dsw-alias-border-l1,#262b31);z-index:1000;display:flex;flex-direction:column;font-size:12px;box-shadow:var(--dsw-shadow-lv2,-12px 0 32px rgba(0,0,0,.45))}\n.sseye-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,#262b31);flex:none}\n.sseye-title{font-weight:600;font-size:13px}\n.sseye-count{color:var(--dsw-alias-label-secondary,#8b949e)}\n.sseye-spacer{flex:1}\n.sseye-btn{font:inherit;font-size:12px;padding:2px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2,rgba(127,137,150,.35));background:transparent;color:inherit;cursor:pointer}\n.sseye-btn:hover{border-color:var(--dsw-alias-brand-primary,#4f8cff);color:var(--dsw-alias-brand-primary,#4f8cff)}\n.sseye-btn[data-active]{border-color:var(--dsw-alias-brand-primary,#4f8cff);color:var(--dsw-alias-brand-primary,#4f8cff)}\n.sseye-body{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0}\n.sseye-listcol{flex:1;overflow-y:auto;min-height:0;padding:4px 0}\n.sseye-tgroup{margin:2px 8px 6px;border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.015))}\n.sseye-tgh{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;background:var(--dsw-alias-bg-layer-1,#171a1f);user-select:none}\n.sseye-tgh:hover{background:var(--dsw-alias-bg-layer-2,#1a1e24)}\n.sseye-tgh-title{font-weight:600;color:var(--dsw-alias-label-primary,#e6edf3);white-space:nowrap}\n.sseye-tgh-prev{color:var(--dsw-alias-label-secondary,#8b949e);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-style:italic}\n.sseye-tgh-agg{color:var(--dsw-alias-label-secondary,#8b949e);white-space:nowrap;font-variant-numeric:tabular-nums}\n.sseye-chev{font-size:14px;line-height:1;display:inline-block;transition:transform .15s;user-select:none;color:var(--dsw-alias-label-secondary,#8b949e);flex:none;font-style:normal}\n.sseye-chev.open{transform:rotate(90deg)}\n.sseye-steps{border-top:1px solid var(--dsw-alias-border-l2,#21262d)}\n.sseye-row{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 22px;border-bottom:1px solid var(--dsw-alias-border-l2,#1d2126);cursor:pointer;position:relative}\n.sseye-row:last-child{border-bottom:none}\n.sseye-row::before{content:"";position:absolute;left:10px;top:0;bottom:0;width:1px;background:var(--dsw-alias-border-l2,#2a2e33)}\n.sseye-row:hover{background:var(--dsw-alias-bg-layer-2,#1a1e24)}\n.sseye-row.sel{background:var(--dsw-alias-bg-layer-2,#1c2430)}\n.sseye-dot{width:7px;height:7px;border-radius:50%;flex:none}\n.sseye-stepchip{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9fb4c7);font-weight:600;white-space:nowrap;min-width:34px}\n.sseye-model{color:var(--dsw-alias-label-primary,#e6edf3);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}\n.sseye-dim{color:var(--dsw-alias-label-secondary,#8b949e);white-space:nowrap;font-variant-numeric:tabular-nums}\n.sseye-prev{color:var(--dsw-alias-label-secondary,#8b949e);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}\n.sseye-detail{flex:1.4;min-height:0;overflow-y:auto;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l2,#262b31)}\n.sseye-sec{margin-bottom:12px}\n.sseye-sec-title{font-weight:600;color:var(--dsw-alias-label-secondary,#9fb4c7);margin-bottom:4px;display:flex;align-items:center;gap:4px;cursor:pointer;list-style:none}\n.sseye-sec-title::-webkit-details-marker{display:none}\n.sseye-pre{background:var(--dsw-alias-bg-layer-1,#0d1117);border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:6px;padding:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word;max-height:320px;overflow-y:auto;margin:4px 0;line-height:1.55}\n.sseye-chip{display:inline-block;padding:0 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-2,#21262d);color:var(--dsw-alias-label-secondary,#9fb4c7);margin-right:6px;font-size:11px;line-height:18px}\n.sseye-reason{color:var(--dsw-alias-label-secondary,#8b949e);font-style:italic}\n.sseye-err{color:var(--dsw-alias-state-error-primary,#e5534b)}\n.sseye-policy{padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,#262b31);background:var(--dsw-alias-bg-layer-1,#171a1f);flex:none}\n.sseye-policy label{display:inline-flex;align-items:center;gap:4px;margin-right:10px;cursor:pointer;white-space:nowrap}\n.sseye-textarea{width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1,#0d1117);color:var(--dsw-alias-label-primary,#d7dbe0);border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:6px;font:inherit;font-size:11px;padding:6px;margin-top:6px}\n.sseye-empty{padding:24px;text-align:center;color:var(--dsw-alias-label-secondary,#8b949e)}\n.sseye-msg{margin-bottom:6px}\n.sseye-msg-new{border-left:2px solid var(--dsw-alias-brand-primary,#4f8cff);padding-left:8px}\n.sseye-shared{margin-bottom:6px}\n.sseye-shared summary{color:var(--dsw-alias-label-secondary,#8b949e);cursor:pointer;font-style:italic}\n.sseye-jkey{color:#4f9cff}\n.sseye-jstr{color:#3fb950}\n.sseye-jnum{color:#d29922}\n.sseye-jbool{color:#a371f7}\n.sseye-jp{color:var(--dsw-alias-label-secondary,#8b949e)}\n.sseye-copywrap{position:relative}\n.sseye-copy{position:absolute;top:4px;right:4px;width:22px;height:22px;display:none;align-items:center;justify-content:center;border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:5px;background:var(--dsw-alias-bg-base,#14161a);color:var(--dsw-alias-label-secondary,#8b949e);cursor:pointer;padding:0;z-index:2;opacity:.92}\n.sseye-copywrap:hover>.sseye-copy{display:inline-flex}\n.sseye-copy:hover{color:var(--dsw-alias-brand-primary,#4f8cff);border-color:var(--dsw-alias-brand-primary,#4f8cff)}\n.sseye-copy.ok{color:var(--dsw-alias-state-success-primary,#34c98e);border-color:var(--dsw-alias-state-success-primary,#34c98e);display:inline-flex}\n')

    function fmtTime(ts) {
      try { return new Date(ts).toLocaleTimeString() } catch (e) { return '' }
    }
    function fmtDur(ms) {
      if (ms === undefined || ms === null) return ''
      if (ms < 1000) return ms + 'ms'
      return (ms / 1000).toFixed(1) + 's'
    }
    function usageText(u) {
      if (!u || typeof u !== 'object') return ''
      const parts = []
      for (const k of ['inputTokens', 'outputTokens', 'cacheReadTokens']) {
        if (typeof u[k] === 'number') parts.push(k.replace('Tokens', '') + ':' + u[k])
      }
      return parts.join(' ')
    }
    function cap(s, n) {
      if (typeof s !== 'string') return ''
      return s.length > n ? s.slice(0, n) + '\n…[截断，共 ' + s.length + ' 字符]' : s
    }
    function tryParse(s) {
      if (typeof s !== 'string') return { ok: false }
      try { return { ok: true, value: JSON.parse(s) } } catch (e) { return { ok: false } }
    }
    function safeStringify(v) {
      try { return JSON.stringify(v, null, 2) } catch (e) { return String(v) }
    }

    function copyText(text, done) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done))
          return
        }
      } catch (e) {}
      fallbackCopy(text, done)
    }
    function fallbackCopy(text, done) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      } catch (e) {}
      done()
    }

    function CopyIcon() {
      return h('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('rect', { x: 9, y: 9, width: 12, height: 12, rx: 2 }),
        h('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }))
    }
    function CheckIcon() {
      return h('svg', { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M20 6L9 17l-5-5' }))
    }

    function CopyWrap(props) {
      const [copied, setCopied] = React.useState(false)
      return h('div', { className: 'sseye-copywrap' },
        props.children,
        h('button', {
          className: 'sseye-copy' + (copied ? ' ok' : ''),
          title: '复制',
          onClick: (e) => {
            e.stopPropagation()
            copyText(props.text, () => {
              setCopied(true)
              ctx.timeout(() => setCopied(false), 1000)
            })
          },
        }, copied ? h(CheckIcon) : h(CopyIcon)))
    }

    function copyable(text, node) {
      return h(CopyWrap, { text: text }, node)
    }
    function copyablePre(text, cls) {
      return h(CopyWrap, { text: text }, h('pre', { className: cls }, text))
    }
    function copyableJson(value) {
      return h(CopyWrap, { text: safeStringify(value) }, h(JsonView, { value: value }))
    }

    function jp(s) { return h('span', { className: 'sseye-jp' }, s) }

    function jsonNode(v, ind, key) {
      const padIn = '  '.repeat(ind + 1)
      const pad = '  '.repeat(ind)
      if (v === null || v === undefined) return h('span', { key: key, className: 'sseye-jbool' }, 'null')
      if (typeof v === 'boolean') return h('span', { key: key, className: 'sseye-jbool' }, String(v))
      if (typeof v === 'number') return h('span', { key: key, className: 'sseye-jnum' }, String(v))
      if (typeof v === 'string') {
        const s = v.length > 4000 ? v.slice(0, 4000) + '…[+' + (v.length - 4000) + ' 字符]' : v
        return h('span', { key: key, className: 'sseye-jstr' }, '"' + s + '"')
      }
      if (Array.isArray(v)) {
        if (v.length === 0) return h('span', { key: key, className: 'sseye-jp' }, '[]')
        const kids = [jp('[\n')]
        v.forEach((item, i) => {
          kids.push(h('span', { key: 'i' + i }, [padIn, jsonNode(item, ind + 1, 'v'), i < v.length - 1 ? ',\n' : '\n']))
        })
        kids.push(jp(pad + ']'))
        return h('span', { key: key }, kids)
      }
      if (typeof v === 'object') {
        const keys = Object.keys(v)
        if (keys.length === 0) return h('span', { key: key, className: 'sseye-jp' }, '{}')
        const kids = [jp('{\n')]
        keys.forEach((k2, i) => {
          kids.push(h('span', { key: 'k' + i }, [padIn, h('span', { className: 'sseye-jkey' }, '"' + k2 + '"'), jp(': '), jsonNode(v[k2], ind + 1, 'v'), i < keys.length - 1 ? ',\n' : '\n']))
        })
        kids.push(jp(pad + '}'))
        return h('span', { key: key }, kids)
      }
      return h('span', { key: key, className: 'sseye-jp' }, String(v))
    }

    function JsonView(props) {
      return h('pre', { className: 'sseye-pre' }, jsonNode(props.value, 0, 'root'))
    }

    function BlockContent(props) {
      const b = props.b
      if (!b || typeof b !== 'object') return copyablePre(cap(String(b), 20000), 'sseye-pre')
      const t = b.type
      if (t === 'text' && typeof b.text === 'string') return copyablePre(cap(b.text, 20000), 'sseye-pre')
      if (t === 'reasoning') {
        const txt = typeof b.reasoning === 'string' ? b.reasoning : (typeof b.text === 'string' ? b.text : '')
        return copyablePre(cap(txt, 20000), 'sseye-pre sseye-reason')
      }
      if (t === 'tool-call' || t === 'tool_call') {
        const args = typeof b.arguments === 'string' ? tryParse(b.arguments) : { ok: b.arguments !== undefined, value: b.arguments }
        return h('div', { className: 'sseye-msg' },
          h('span', { className: 'sseye-chip' }, 'tool-call ' + (b.name || '')),
          args.ok ? copyableJson(args.value) : copyablePre(cap(String(b.arguments || ''), 20000), 'sseye-pre'))
      }
      if (t === 'tool-result' || t === 'tool_result' || t === 'toolResult') {
        const kids = [h('div', { key: 'h' },
          h('span', { className: 'sseye-chip' }, 'tool-result' + (b.toolCallId ? ' ' + String(b.toolCallId) : '')),
          b.isError ? h('span', { className: 'sseye-chip sseye-err' }, 'error') : null)]
        if (Array.isArray(b.content)) {
          for (let i = 0; i < b.content.length; i++) kids.push(h(BlockContent, { key: 'c' + i, b: b.content[i] }))
        } else if (b.content !== undefined) {
          kids.push(h(CopyWrap, { key: 'c', text: safeStringify(b.content) }, h(JsonView, { value: b.content })))
        }
        return h('div', null, kids)
      }
      if (t === 'image') return h('div', { className: 'sseye-dim' }, '[image 已省略]')
      return copyableJson(b)
    }

    function logErr(where) {
      return (e) => { try { console.error('[sseye] ' + where + ' failed:', e && e.message ? e.message : String(e)) } catch (_) {} }
    }

    function pull() {
      host.call('list').then((items) => {
        const arr = Array.isArray(items) ? items : []
        let sig = String(arr.length)
        for (const it of arr) sig += '|' + it.id + ':' + it.status + ':' + it.chunks
        if (sig !== lastSig) {
          lastSig = sig
          store.items = arr
          store.emit()
        }
      }).catch(logErr('list'))
      if (store.selectedId) {
        const cur = store.detail
        if (!cur || cur.id !== store.selectedId || cur.status === 'running') {
          host.call('get', { id: store.selectedId }).then((d) => {
            if (d && d.id === store.selectedId) {
              store.detail = d
              store.emit()
            }
          }).catch(logErr('get'))
        }
      }
    }
    let lastSig = ''

    function setPolicy(patch) {
      host.call('set-policy', patch).then((p) => {
        if (p) store.policy = p
        store.emit()
      }).catch(logErr('set-policy'))
    }

    function dot(status) {
      const color = status === 'finished' ? 'var(--dsw-alias-state-success-primary,#34c98e)' : status === 'error' ? 'var(--dsw-alias-state-error-primary,#e5534b)' : 'var(--dsw-alias-state-warn-primary,#f0b429)'
      return h('span', { className: 'sseye-dot', style: { background: color } })
    }

    function TriggerIcon(props) {
      const size = props && props.size ? props.size : 20
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' },
        h('circle', { cx: 12, cy: 12, r: 2.1, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 12, cy: 12, r: 6 }),
        h('circle', { cx: 12, cy: 12, r: 10 }),
        h('path', { d: 'M12 12 L19.5 6.5' }))
    }

    function Chevron(props) {
      return h('span', { className: 'sseye-chev' + (props.open ? ' open' : '') }, '›')
    }

    function groupItems(items) {
      const groups = []
      const byKey = new Map()
      for (const it of items) {
        let key, kind
        if (it.turn !== undefined && it.turn !== null) { key = 'T:' + (it.sessionId || '?') + ':' + it.turn; kind = 'turn' }
        else { key = 'O:' + (it.source || 'other') + ':' + (it.sessionId || '?'); kind = 'other' }
        let g = byKey.get(key)
        if (!g) { g = { key: key, kind: kind, turn: it.turn, sessionId: it.sessionId, source: it.source, rows: [], latest: 0 }; byKey.set(key, g); groups.push(g) }
        g.rows.push(it)
        if (it.startedAt > g.latest) g.latest = it.startedAt
      }
      groups.sort((a, b) => b.latest - a.latest)
      for (const g of groups) g.rows.sort((a, b) => a.startedAt - b.startedAt)
      return groups
    }

    function StepRow(props) {
      const it = props.it
      const cls = store.selectedId === it.id ? 'sseye-row sel' : 'sseye-row'
      const kids = [
        dot(it.status),
        h('span', { key: 's', className: 'sseye-stepchip' }, it.step !== undefined && it.step !== null ? 'S' + it.step : (it.source || '')),
      ]
      kids.push(h('span', { key: 't', className: 'sseye-dim' }, fmtTime(it.startedAt)))
      kids.push(h('span', { key: 'p', className: 'sseye-prev' }, it.replyPreview || it.preview || ''))
      if (it.ttftMs !== undefined) kids.push(h('span', { key: 'ttft', className: 'sseye-dim' }, 'TTFT ' + fmtDur(it.ttftMs)))
      kids.push(h('span', { key: 'd', className: 'sseye-dim' }, fmtDur(it.durationMs)))
      if (it.usage) kids.push(h('span', { key: 'u', className: 'sseye-dim' }, usageText(it.usage)))
      return h('div', { className: cls, onClick: props.onSelect }, kids)
    }

    function TurnGroup(props) {
      const g = props.g
      const isOpen = store.openGroups[g.key] !== false
      let inTok = 0, outTok = 0, dur = 0, running = 0
      for (const r of g.rows) {
        if (r.usage) {
          if (typeof r.usage.inputTokens === 'number') inTok += r.usage.inputTokens
          if (typeof r.usage.outputTokens === 'number') outTok += r.usage.outputTokens
        }
        if (r.durationMs) dur += r.durationMs
        if (r.status === 'running') running++
      }
      const title = g.kind === 'turn' ? 'Turn ' + g.turn : (g.source === 'compaction' ? 'Compaction' : g.source === 'title' ? '会话标题' : '其他调用')
      const prev = g.rows.length && g.rows[0].preview ? g.rows[0].preview : ''
      return h('div', { className: 'sseye-tgroup' },
        h('div', {
          className: 'sseye-tgh',
          onClick: () => { store.openGroups[g.key] = !isOpen; store.emit() },
        },
          h(Chevron, { open: isOpen }),
          h('span', { className: 'sseye-tgh-title' }, title),
          h('span', { className: 'sseye-chip' }, g.rows.length + ' 次调用' + (running ? ' · ' + running + ' 进行中' : '')),
          h('span', { className: 'sseye-tgh-prev' }, prev),
          h('span', { className: 'sseye-tgh-agg' }, 'in:' + inTok + ' out:' + outTok + ' · ' + fmtDur(dur))),
        isOpen ? h('div', { className: 'sseye-steps' }, g.rows.map((it) => h(StepRow, {
          key: it.id, it: it,
          onSelect: () => {
            store.selectedId = it.id
            store.detail = null
            store.emit()
            host.call('get', { id: it.id }).then((d) => { if (d) store.detail = d; store.emit() }).catch(logErr('get:select'))
          },
        }))) : null)
    }

    function Section(props) {
      const [open, setOpen] = React.useState(!!props.defaultOpen)
      return h('div', { className: 'sseye-sec' },
        h('div', { className: 'sseye-sec-title', onClick: () => setOpen(!open) }, h(Chevron, { open: open }), props.title),
        open ? props.children : null)
    }

    function MessageView(props) {
      const m = props.m
      const role = m && typeof m.role === 'string' ? m.role : 'unknown'
      let body = null
      const c = m ? m.content : undefined
      if (typeof c === 'string') body = copyablePre(cap(c, 20000), 'sseye-pre')
      else if (Array.isArray(c)) body = c.map((b, i) => h(BlockContent, { key: i, b: b }))
      else if (c !== undefined) body = copyableJson(c)
      else if (m && typeof m === 'object') {
        const rest = {}
        let has = false
        for (const k of Object.keys(m)) { if (k !== 'role') { rest[k] = m[k]; has = true } }
        if (has) body = copyableJson(rest)
      }
      return h('div', { className: 'sseye-msg' + (props.isNew ? ' sseye-msg-new' : '') },
        h('span', { className: 'sseye-chip' }, role), body)
    }

    function BlockView(props) {
      const b = props.b
      const label = '#' + b.index + ' ' + b.kind + (b.toolName ? ' ' + b.toolName : '') + ' · ' + b.chars + ' chars'
      let body = null
      if (b.kind === 'reasoning' && b.reasoning) body = copyablePre(cap(b.reasoning, 20000), 'sseye-pre sseye-reason')
      else if (b.kind === 'tool-call') {
        const args = tryParse(b.args)
        body = args.ok ? copyableJson(args.value) : copyablePre(cap(b.args, 20000), 'sseye-pre')
      } else if (b.text) body = copyablePre(cap(b.text, 20000), 'sseye-pre')
      return h('div', { className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, label), body)
    }

    function Detail() {
      const d = store.detail
      if (!d) return h('div', { className: 'sseye-detail' }, h('div', { className: 'sseye-empty' }, '加载中…'))
      const req = d.request || {}
      const kids = []
      const meta = []
      meta.push(h('span', { key: 'st', className: 'sseye-chip' }, d.status || ''))
      if (d.source) meta.push(h('span', { key: 'so', className: 'sseye-chip' }, d.source))
      if (d.protocol) meta.push(h('span', { key: 'pr', className: 'sseye-chip' }, d.protocol))
      if (d.turn !== undefined && d.turn !== null) meta.push(h('span', { key: 'ts', className: 'sseye-chip' }, 'T' + d.turn + ' · S' + d.step))
      if (d.ttftMs !== undefined) meta.push(h('span', { key: 'tt', className: 'sseye-chip' }, 'TTFT ' + fmtDur(d.ttftMs)))
      if (d.durationMs !== undefined) meta.push(h('span', { key: 'du', className: 'sseye-chip' }, '总时长 ' + fmtDur(d.durationMs)))
      meta.push(h('span', { key: 'ch', className: 'sseye-chip' }, d.chunks + ' chunks'))
      kids.push(h('div', { key: 'meta', className: 'sseye-sec' }, meta))

      if (d.error) kids.push(h('div', { key: 'err', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title sseye-err' }, '错误'), copyablePre(String(d.error), 'sseye-pre sseye-err')))
      if (d.usage) kids.push(h('div', { key: 'us', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Usage'), copyableJson(d.usage)))

      kids.push(h('div', { key: 'rq', className: 'sseye-sec' },
        h('div', { className: 'sseye-sec-title' }, '请求 · ' + String(req.provider || '') + '/' + String(req.model || '')),
        req.reasoningEffort !== undefined ? h('span', { className: 'sseye-chip' }, 'effort ' + String(req.reasoningEffort)) : null,
        req.temperature !== undefined ? h('span', { className: 'sseye-chip' }, 'temp ' + String(req.temperature)) : null,
        req.maxTokens !== undefined ? h('span', { className: 'sseye-chip' }, 'max ' + String(req.maxTokens)) : null))

      if (typeof req.system === 'string' && req.system) {
        kids.push(h(Section, { key: 'sys', title: 'System Prompt（' + req.system.length + ' 字符）' },
          copyablePre(cap(req.system, 30000), 'sseye-pre')))
      } else if (req.systemOmitted) {
        kids.push(h('div', { key: 'sys', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'System Prompt（按策略未捕获）')))
      }

      if (Array.isArray(req.messages)) {
        const shared = typeof d.sharedPrefix === 'number' ? d.sharedPrefix : 0
        const newCount = req.messages.length - shared
        const DIRECT_TAIL = 30
        const msgKids = [h('div', { key: 'h', className: 'sseye-sec-title' }, 'Messages（共 ' + req.messages.length + ' 条' + (shared > 0 ? ' · 与前序共享 ' + shared + ' 条' : '') + (shared > 0 ? ' · 新增 ' + newCount + ' 条' : '') + '）')]
        if (shared > 0) {
          msgKids.push(h(Section, { key: 'shared', title: '与前一次调用共享的前 ' + shared + ' 条消息（点击展开）' },
            req.messages.slice(0, shared).map((m, i) => h(MessageView, { key: i, m: m }))))
        }
        const tail = req.messages.slice(shared)
        const folded = tail.length > DIRECT_TAIL ? tail.length - DIRECT_TAIL : 0
        if (folded > 0) {
          msgKids.push(h(Section, { key: 'older', title: '更早的 ' + folded + ' 条消息（点击展开）' },
            tail.slice(0, folded).map((m, i) => h(MessageView, { key: 'o' + i, m: m }))))
        }
        tail.slice(folded).forEach((m, i) => {
          msgKids.push(h(MessageView, { key: 'n' + i, m: m, isNew: shared > 0 && folded === 0 }))
        })
        kids.push(h('div', { key: 'msgs', className: 'sseye-sec' }, msgKids))
      } else if (req.messagesOmitted) {
        kids.push(h('div', { key: 'msgs', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Messages（' + req.messagesOmitted + ' 条，按策略未捕获）')))
      }

      if (Array.isArray(req.tools)) {
        const names = req.tools.map((t) => t && t.name)
        kids.push(h(Section, { key: 'tls', title: 'Tools（' + req.tools.length + ' 个）' },
          copyableJson(names)))
      }

      if (d.wire) {
        kids.push(h(Section, { key: 'wire', title: 'Wire JSON（重建，近似）' },
          copyablePre(cap(safeStringify(d.wire), 40000), 'sseye-pre')))
      }

      if (Array.isArray(d.blocks) && d.blocks.length > 0) {
        kids.push(h('div', { key: 'resp', className: 'sseye-sec' },
          h('div', { className: 'sseye-sec-title' }, '响应 · ' + d.blocks.length + ' 个块'),
          d.blocks.map((b) => h(BlockView, { key: b.index, b: b }))))
      }
      if (d.finishReason !== undefined) {
        kids.push(h('div', { key: 'fin', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Finish'), copyableJson(d.finishReason)))
      }
      return h('div', { className: 'sseye-detail' }, kids)
    }

    function PolicyPanel() {
      const p = store.policy
      if (!p) return null
      const srcLabels = [['agent', 'Agent 调用'], ['compaction', 'Compaction'], ['title', '会话标题'], ['other', '其他/重放']]
      const fldLabels = [['system', 'system'], ['messages', 'messages'], ['tools', 'tools'], ['reasoning', 'reasoning'], ['text', '正文'], ['toolArgs', '工具参数']]
      return h('div', { className: 'sseye-policy' },
        h('div', null, '来源：', srcLabels.map((kv) =>
          h('label', { key: kv[0] }, h('input', {
            type: 'checkbox', checked: !!(p.sources && p.sources[kv[0]]),
            onChange: (e) => {
              const patch = { sources: {} }
              patch.sources[kv[0]] = e.target.checked
              if (store.policy && store.policy.sources) store.policy.sources[kv[0]] = e.target.checked
              setPolicy(patch)
            },
          }), kv[1]))),
        h('div', { style: { marginTop: '6px' } }, '字段：', fldLabels.map((kv) =>
          h('label', { key: kv[0] }, h('input', {
            type: 'checkbox', checked: !!(p.fields && p.fields[kv[0]]),
            onChange: (e) => {
              const patch = { fields: {} }
              patch.fields[kv[0]] = e.target.checked
              if (store.policy && store.policy.fields) store.policy.fields[kv[0]] = e.target.checked
              setPolicy(patch)
            },
          }), kv[1]))),
        h('textarea', {
          className: 'sseye-textarea', rows: 2,
          placeholder: '脱敏正则，每行一条；命中替换为 ***（失焦生效）',
          defaultValue: (p.redactions || []).join('\n'),
          onBlur: (e) => {
            const lines = String(e.target.value || '').split('\n').map((s) => s.trim()).filter(Boolean)
            setPolicy({ redactions: lines })
          },
        }))
    }

    function Panel() {
      const [, force] = React.useState(0)
      React.useEffect(() => {
        const f = () => force((n) => n + 1)
        store.listeners.add(f)
        return () => { store.listeners.delete(f) }
      }, [])
      React.useEffect(() => {
        if (!store.open) return undefined
        let dead = false
        const tick = () => { if (!dead) pull() }
        tick()
        const stop = ctx.interval(tick, 1500)
        return () => { dead = true; stop() }
      }, [store.open])
      if (!store.open) return null
      const all = store.items
      const items = (store.onlyThisSession && store.sessionId) ? all.filter((it) => it.sessionId === store.sessionId) : all
      const groups = groupItems(items)
      return h('div', { className: 'sseye-panel' },
        h('div', { className: 'sseye-head' },
          h('span', { className: 'sseye-title' }, 'SSEye'),
          h('span', { className: 'sseye-count' }, groups.length + ' 轮 · ' + items.length + ' 次调用'),
          h('button', {
            className: 'sseye-btn',
            'data-active': store.onlyThisSession ? '' : undefined,
            onClick: () => { store.onlyThisSession = !store.onlyThisSession; store.emit() },
          }, store.onlyThisSession ? '本会话' : '全部'),
          h('span', { className: 'sseye-spacer' }),
          h('button', {
            className: 'sseye-btn',
            onClick: () => {
              store.showPolicy = !store.showPolicy
              if (store.showPolicy && !store.policy) {
                host.call('get-policy').then((p) => { if (p) store.policy = p; store.emit() }).catch(logErr('get-policy'))
              }
              store.emit()
            },
          }, store.showPolicy ? '收起策略' : '抓取策略'),
          h('button', {
            className: 'sseye-btn',
            onClick: () => {
              host.call('clear').then(() => { store.items = []; store.selectedId = null; store.detail = null; store.emit() }).catch(logErr('clear'))
            },
          }, '清空'),
          h('button', {
            className: 'sseye-btn',
            onClick: () => { store.open = false; store.emit() },
          }, '关闭')),
        store.showPolicy ? h(PolicyPanel) : null,
        h('div', { className: 'sseye-body' },
          h('div', { className: 'sseye-listcol' },
            groups.length === 0
              ? h('div', { className: 'sseye-empty' }, '暂无捕获。发起一次对话或调用后此处出现记录。')
              : groups.map((g) => h(TurnGroup, { key: g.key, g: g }))),
          store.selectedId ? h(Detail) : null))
    }

    slots.inject('conversation.session.header.utilities', () => slots.register(
      { name: 'conversation.session.header.utilities', id: 'sseye-trigger', label: 'SSEye' },
      (props) => {
        if (props && props.sessionId) store.sessionId = String(props.sessionId)
        return h('button', {
          className: 'sseye-hbtn',
          'data-active': store.open ? '' : undefined,
          title: 'SSEye · LLM 调试台',
          onClick: () => { store.open = !store.open; store.emit() },
        }, h(TriggerIcon, { size: 15 }), 'SSEye')
      },
    ))

    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'sseye-panel', label: 'SSEye' },
      () => h(Panel),
    ))
  },
}
