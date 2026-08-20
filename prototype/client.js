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

    styles.insert('\n.sseye-hbtn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(127,137,150,.35));background:transparent;color:var(--dsw-alias-label-secondary,#9fb4c7);cursor:pointer;line-height:20px}\n.sseye-hbtn:hover{border-color:var(--dsw-alias-state-business-primary,#4f8cff);color:var(--dsw-alias-state-business-primary,#4f8cff)}\n.sseye-hbtn[data-active]{background:var(--dsw-alias-state-business-primary,#4f8cff);border-color:var(--dsw-alias-state-business-primary,#4f8cff);color:#fff}\n.sseye-hbtn svg{width:15px;height:15px}\n.sseye-panel{position:fixed;top:0;right:0;bottom:0;width:660px;max-width:94vw;background:var(--dsw-alias-bg-base,#14161a);color:var(--dsw-alias-label-primary,#d7dbe0);border-left:1px solid var(--dsw-alias-border-l1,#262b31);z-index:1000;display:flex;flex-direction:column;font-size:12px;box-shadow:var(--dsw-shadow-lv2,-12px 0 32px rgba(0,0,0,.45))}\n.sseye-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,#262b31);flex:none}\n.sseye-title{font-weight:600;font-size:13px}\n.sseye-count{color:var(--dsw-alias-label-tertiary,#8b949e)}\n.sseye-spacer{flex:1}\n.sseye-btn{font:inherit;font-size:12px;padding:2px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2,rgba(127,137,150,.35));background:transparent;color:inherit;cursor:pointer}\n.sseye-btn:hover{border-color:var(--dsw-alias-state-business-primary,#4f8cff);color:var(--dsw-alias-state-business-primary,#4f8cff)}\n.sseye-btn[data-active]{border-color:var(--dsw-alias-state-business-primary,#4f8cff);color:var(--dsw-alias-state-business-primary,#4f8cff)}\n.sseye-body{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0}\n.sseye-listcol{flex:1;overflow-y:auto;min-height:0;padding:4px 0}\n.sseye-tgroup{margin:2px 8px 6px;border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-secondary,rgba(255,255,255,.015))}\n.sseye-tgh{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;background:var(--dsw-alias-bg-secondary,#171a1f);user-select:none}\n.sseye-tgh:hover{background:var(--dsw-alias-interactive-bg-hover,#1a1e24)}\n.sseye-tgh-title{font-weight:600;color:var(--dsw-alias-label-primary,#e6edf3);white-space:nowrap}\n.sseye-tgh-prev{color:var(--dsw-alias-label-tertiary,#8b949e);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-style:italic}\n.sseye-tgh-agg{color:var(--dsw-alias-label-tertiary,#8b949e);white-space:nowrap;font-variant-numeric:tabular-nums}\n.sseye-chev{font-family:var(--sseye-icon-font,inherit);font-size:16px;line-height:1;display:inline-block;transition:transform .15s;user-select:none;color:var(--dsw-alias-label-tertiary,#8b949e);flex:none}\n.sseye-chev.open{transform:rotate(90deg)}\n.sseye-steps{border-top:1px solid var(--dsw-alias-border-l2,#21262d)}\n.sseye-row{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 22px;border-bottom:1px solid var(--dsw-alias-border-l2,#1d2126);cursor:pointer;position:relative}\n.sseye-row:last-child{border-bottom:none}\n.sseye-row::before{content:"";position:absolute;left:10px;top:0;bottom:0;width:1px;background:var(--dsw-alias-border-l2,#2a2e33)}\n.sseye-row:hover{background:var(--dsw-alias-interactive-bg-hover,#1a1e24)}\n.sseye-row.sel{background:var(--dsw-alias-interactive-bg-hover,#1c2430)}\n.sseye-dot{width:7px;height:7px;border-radius:50%;flex:none}\n.sseye-stepchip{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9fb4c7);font-weight:600;white-space:nowrap;min-width:34px}\n.sseye-model{color:var(--dsw-alias-label-primary,#e6edf3);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}\n.sseye-dim{color:var(--dsw-alias-label-tertiary,#8b949e);white-space:nowrap;font-variant-numeric:tabular-nums}\n.sseye-prev{color:var(--dsw-alias-label-tertiary,#8b949e);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}\n.sseye-detail{flex:1.4;min-height:0;overflow-y:auto;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l2,#262b31)}\n.sseye-sec{margin-bottom:12px}\n.sseye-sec-title{font-weight:600;color:var(--dsw-alias-label-secondary,#9fb4c7);margin-bottom:4px;display:flex;align-items:center;gap:4px;cursor:pointer;list-style:none}\n.sseye-sec-title::-webkit-details-marker{display:none}\n.sseye-pre{background:var(--dsw-alias-markdown-code-block,#0d1117);border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:6px;padding:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word;max-height:320px;overflow-y:auto;margin:4px 0}\n.sseye-chip{display:inline-block;padding:0 6px;border-radius:4px;background:var(--dsw-alias-button-ghost-active-fill,#21262d);color:var(--dsw-alias-label-secondary,#9fb4c7);margin-right:6px;font-size:11px;line-height:18px}\n.sseye-reason{color:var(--dsw-alias-label-tertiary,#8b949e);font-style:italic}\n.sseye-err{color:var(--dsw-alias-state-error-primary,#e5534b)}\n.sseye-policy{padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,#262b31);background:var(--dsw-alias-bg-secondary,#171a1f);flex:none}\n.sseye-policy label{display:inline-flex;align-items:center;gap:4px;margin-right:10px;cursor:pointer;white-space:nowrap}\n.sseye-textarea{width:100%;box-sizing:border-box;background:var(--dsw-alias-markdown-code-block,#0d1117);color:var(--dsw-alias-label-primary,#d7dbe0);border:1px solid var(--dsw-alias-border-l2,#21262d);border-radius:6px;font:inherit;font-size:11px;padding:6px;margin-top:6px}\n.sseye-empty{padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary,#8b949e)}\n.sseye-msg{margin-bottom:6px}\n.sseye-msg-new{border-left:2px solid var(--dsw-alias-state-business-primary,#4f8cff);padding-left:8px}\n.sseye-shared{margin-bottom:6px}\n.sseye-shared summary{color:var(--dsw-alias-label-tertiary,#8b949e);cursor:pointer;font-style:italic}\n')

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
    function prettyArgs(s) {
      if (typeof s !== 'string' || !s) return ''
      try { return JSON.stringify(JSON.parse(s), null, 2) } catch (e) { return s }
    }

    function pull() {
      host.call('list').then((items) => {
        store.items = Array.isArray(items) ? items : []
        store.emit()
      }).catch(() => {})
      if (store.selectedId) {
        host.call('get', { id: store.selectedId }).then((d) => {
          if (d) store.detail = d
          store.emit()
        }).catch(() => {})
      }
    }

    function setPolicy(patch) {
      host.call('set-policy', patch).then((p) => {
        if (p) store.policy = p
        store.emit()
      }).catch(() => {})
    }

    function dot(status) {
      const color = status === 'finished' ? 'var(--dsw-alias-state-success-primary,#34c98e)' : status === 'error' ? 'var(--dsw-alias-state-error-primary,#e5534b)' : 'var(--dsw-alias-state-warn-label,#f0b429)'
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
            host.call('get', { id: it.id }).then((d) => { if (d) store.detail = d; store.emit() }).catch(() => {})
          },
        }))) : null)
    }

    function MessageView(props) {
      const m = props.m
      const role = m && typeof m.role === 'string' ? m.role : 'unknown'
      let body = ''
      const c = m ? m.content : undefined
      if (typeof c === 'string') body = c
      else if (Array.isArray(c)) {
        body = c.map((b) => {
          if (!b || typeof b !== 'object') return String(b)
          if (typeof b.text === 'string') return b.text
          if (b.type === 'reasoning') return '[reasoning]\n' + (typeof b.reasoning === 'string' ? b.reasoning : JSON.stringify(b))
          if (b.type === 'tool-call' || b.type === 'tool_call') return '[tool-call ' + (b.name || '') + '] ' + (typeof b.arguments === 'string' ? b.arguments : JSON.stringify(b))
          return JSON.stringify(b)
        }).join('\n')
      } else if (c !== undefined) body = JSON.stringify(c)
      return h('div', { className: 'sseye-msg' + (props.isNew ? ' sseye-msg-new' : '') },
        h('span', { className: 'sseye-chip' }, role),
        h('pre', { className: 'sseye-pre' }, cap(body, 20000)))
    }

    function BlockView(props) {
      const b = props.b
      const label = '#' + b.index + ' ' + b.kind + (b.toolName ? ' ' + b.toolName : '') + ' · ' + b.chars + ' chars'
      let body = null
      if (b.kind === 'reasoning' && b.reasoning) body = h('pre', { className: 'sseye-pre sseye-reason' }, cap(b.reasoning, 20000))
      else if (b.kind === 'tool-call') body = h('pre', { className: 'sseye-pre' }, cap(prettyArgs(b.args), 20000))
      else if (b.text) body = h('pre', { className: 'sseye-pre' }, cap(b.text, 20000))
      return h('div', { className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, label), body)
    }

    function Detail() {
      const d = store.detail
      if (!d) return h('div', { className: 'sseye-empty' }, '加载中…')
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

      if (d.error) kids.push(h('div', { key: 'err', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title sseye-err' }, '错误'), h('pre', { className: 'sseye-pre sseye-err' }, String(d.error))))
      if (d.usage) kids.push(h('div', { key: 'us', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Usage'), h('pre', { className: 'sseye-pre' }, JSON.stringify(d.usage, null, 2))))

      kids.push(h('div', { key: 'rq', className: 'sseye-sec' },
        h('div', { className: 'sseye-sec-title' }, '请求 · ' + String(req.provider || '') + '/' + String(req.model || '')),
        req.reasoningEffort !== undefined ? h('span', { className: 'sseye-chip' }, 'effort ' + String(req.reasoningEffort)) : null,
        req.temperature !== undefined ? h('span', { className: 'sseye-chip' }, 'temp ' + String(req.temperature)) : null,
        req.maxTokens !== undefined ? h('span', { className: 'sseye-chip' }, 'max ' + String(req.maxTokens)) : null))

      if (typeof req.system === 'string' && req.system) {
        kids.push(h('details', { key: 'sys', className: 'sseye-sec' },
          h('summary', { className: 'sseye-sec-title' }, h(Chevron, { open: false }), 'System Prompt（' + req.system.length + ' 字符）'),
          h('pre', { className: 'sseye-pre' }, cap(req.system, 30000))))
      } else if (req.systemOmitted) {
        kids.push(h('div', { key: 'sys', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'System Prompt（按策略未捕获）')))
      }

      if (Array.isArray(req.messages)) {
        const shared = typeof d.sharedPrefix === 'number' ? d.sharedPrefix : 0
        const newCount = req.messages.length - shared
        const msgKids = [h('div', { key: 'h', className: 'sseye-sec-title' }, 'Messages（共 ' + req.messages.length + ' 条' + (shared > 0 ? ' · 与前序共享 ' + shared + ' 条' : '') + (shared > 0 ? ' · 新增 ' + newCount + ' 条' : '') + '）')]
        if (shared > 0) {
          msgKids.push(h('details', { key: 'shared', className: 'sseye-shared' },
            h('summary', null, '与前一次调用共享的前 ' + shared + ' 条消息（点击展开）'),
            req.messages.slice(0, shared).map((m, i) => h(MessageView, { key: i, m: m }))))
        }
        req.messages.slice(shared).forEach((m, i) => {
          msgKids.push(h(MessageView, { key: 'n' + i, m: m, isNew: shared > 0 }))
        })
        kids.push(h('div', { key: 'msgs', className: 'sseye-sec' }, msgKids))
      } else if (req.messagesOmitted) {
        kids.push(h('div', { key: 'msgs', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Messages（' + req.messagesOmitted + ' 条，按策略未捕获）')))
      }

      if (Array.isArray(req.tools)) {
        kids.push(h('details', { key: 'tls', className: 'sseye-sec' },
          h('summary', { className: 'sseye-sec-title' }, h(Chevron, { open: false }), 'Tools（' + req.tools.length + ' 个）'),
          h('pre', { className: 'sseye-pre' }, cap(JSON.stringify(req.tools.map((t) => t && t.name), null, 2), 4000))))
      }

      if (d.wire) {
        kids.push(h('details', { key: 'wire', className: 'sseye-sec' },
          h('summary', { className: 'sseye-sec-title' }, h(Chevron, { open: false }), 'Wire JSON（重建，近似）'),
          h('pre', { className: 'sseye-pre' }, cap(JSON.stringify(d.wire, null, 2), 40000))))
      }

      if (Array.isArray(d.blocks) && d.blocks.length > 0) {
        kids.push(h('div', { key: 'resp', className: 'sseye-sec' },
          h('div', { className: 'sseye-sec-title' }, '响应 · ' + d.blocks.length + ' 个块'),
          d.blocks.map((b) => h(BlockView, { key: b.index, b: b }))))
      }
      if (d.finishReason !== undefined) {
        kids.push(h('div', { key: 'fin', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Finish'), h('pre', { className: 'sseye-pre' }, JSON.stringify(d.finishReason))))
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
                host.call('get-policy').then((p) => { if (p) store.policy = p; store.emit() }).catch(() => {})
              }
              store.emit()
            },
          }, store.showPolicy ? '收起策略' : '抓取策略'),
          h('button', {
            className: 'sseye-btn',
            onClick: () => {
              host.call('clear').then(() => { store.items = []; store.selectedId = null; store.detail = null; store.emit() }).catch(() => {})
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
