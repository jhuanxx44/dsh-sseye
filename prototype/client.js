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
      listeners: new Set(),
      emit() {
        for (const f of Array.from(this.listeners)) { try { f() } catch (e) {} }
      },
    }

    styles.insert('\n.sseye-fab{font:inherit;font-size:12px;padding:2px 10px;border-radius:6px;border:1px solid rgba(127,137,150,.4);background:transparent;color:inherit;cursor:pointer}\n.sseye-fab:hover{border-color:#4f8cff;color:#4f8cff}\n.sseye-panel{position:fixed;top:0;right:0;bottom:0;width:600px;max-width:94vw;background:#14161a;color:#d7dbe0;border-left:1px solid #262b31;z-index:1000;display:flex;flex-direction:column;font-size:12px;box-shadow:-12px 0 32px rgba(0,0,0,.45)}\n.sseye-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid #262b31;flex:none}\n.sseye-title{font-weight:600;font-size:13px}\n.sseye-count{color:#8b949e}\n.sseye-spacer{flex:1}\n.sseye-btn{font:inherit;font-size:12px;padding:2px 8px;border-radius:6px;border:1px solid rgba(127,137,150,.35);background:transparent;color:inherit;cursor:pointer}\n.sseye-btn:hover{border-color:#4f8cff;color:#4f8cff}\n.sseye-body{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0}\n.sseye-listcol{flex:1;overflow-y:auto;min-height:0}\n.sseye-row{display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid #1d2126;cursor:pointer}\n.sseye-row:hover{background:#1a1e24}\n.sseye-row.sel{background:#1c2430}\n.sseye-dot{width:8px;height:8px;border-radius:50%;flex:none}\n.sseye-model{color:#e6edf3;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}\n.sseye-dim{color:#8b949e;white-space:nowrap}\n.sseye-prev{color:#8b949e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}\n.sseye-detail{flex:1.4;min-height:0;overflow-y:auto;padding:8px 12px;border-top:1px solid #262b31}\n.sseye-sec{margin-bottom:10px}\n.sseye-sec-title{font-weight:600;color:#9fb4c7;margin-bottom:4px}\n.sseye-pre{background:#0d1117;border:1px solid #21262d;border-radius:6px;padding:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word;max-height:320px;overflow-y:auto;margin:4px 0}\n.sseye-chip{display:inline-block;padding:0 6px;border-radius:4px;background:#21262d;color:#9fb4c7;margin-right:6px;font-size:11px}\n.sseye-reason{color:#8b949e;font-style:italic}\n.sseye-err{color:#e5534b}\n.sseye-policy{padding:8px 12px;border-bottom:1px solid #262b31;background:#171a1f;flex:none}\n.sseye-policy label{display:inline-flex;align-items:center;gap:4px;margin-right:10px;cursor:pointer;white-space:nowrap}\n.sseye-textarea{width:100%;box-sizing:border-box;background:#0d1117;color:#d7dbe0;border:1px solid #21262d;border-radius:6px;font:inherit;font-size:11px;padding:6px;margin-top:6px}\n.sseye-empty{padding:24px;text-align:center;color:#8b949e}\n.sseye-msg{margin-bottom:6px}\n')

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
      for (const k of Object.keys(u)) {
        const v = u[k]
        if (typeof v === 'number') parts.push(k + ':' + v)
      }
      return parts.slice(0, 3).join(' ')
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
      const color = status === 'finished' ? '#34c98e' : status === 'error' ? '#e5534b' : '#f0b429'
      return h('span', { className: 'sseye-dot', style: { background: color } })
    }

    function Row(props) {
      const it = props.it
      const cls = store.selectedId === it.id ? 'sseye-row sel' : 'sseye-row'
      const kids = [
        dot(it.status),
        h('span', { key: 't', className: 'sseye-dim' }, fmtTime(it.startedAt)),
        h('span', { key: 'm', className: 'sseye-model' }, String(it.provider || '') + '/' + String(it.model || '')),
      ]
      if (it.turn !== undefined && it.turn !== null) kids.push(h('span', { key: 'ts', className: 'sseye-chip' }, 'T' + it.turn + '·S' + it.step))
      if (it.source && it.source !== 'agent') kids.push(h('span', { key: 'src', className: 'sseye-chip' }, it.source))
      kids.push(h('span', { key: 'p', className: 'sseye-prev' }, it.preview || ''))
      if (it.ttftMs !== undefined) kids.push(h('span', { key: 'ttft', className: 'sseye-dim' }, 'TTFT ' + fmtDur(it.ttftMs)))
      kids.push(h('span', { key: 'd', className: 'sseye-dim' }, fmtDur(it.durationMs)))
      if (it.usage) kids.push(h('span', { key: 'u', className: 'sseye-dim' }, usageText(it.usage)))
      return h('div', { className: cls, onClick: props.onSelect }, kids)
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
      return h('div', { className: 'sseye-msg' },
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
      if (d.sessionId) meta.push(h('span', { key: 'se', className: 'sseye-chip' }, 'session ' + String(d.sessionId).slice(0, 8)))
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
          h('summary', { className: 'sseye-sec-title' }, 'System Prompt（' + req.system.length + ' 字符）'),
          h('pre', { className: 'sseye-pre' }, cap(req.system, 30000))))
      } else if (req.systemOmitted) {
        kids.push(h('div', { key: 'sys', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'System Prompt（按策略未捕获）')))
      }

      if (Array.isArray(req.messages)) {
        kids.push(h('div', { key: 'msgs', className: 'sseye-sec' },
          h('div', { className: 'sseye-sec-title' }, 'Messages（' + req.messages.length + ' 条）'),
          req.messages.map((m, i) => h(MessageView, { key: i, m: m }))))
      } else if (req.messagesOmitted) {
        kids.push(h('div', { key: 'msgs', className: 'sseye-sec' }, h('div', { className: 'sseye-sec-title' }, 'Messages（' + req.messagesOmitted + ' 条，按策略未捕获）')))
      }

      if (Array.isArray(req.tools)) {
        kids.push(h('details', { key: 'tls', className: 'sseye-sec' },
          h('summary', { className: 'sseye-sec-title' }, 'Tools（' + req.tools.length + ' 个）'),
          h('pre', { className: 'sseye-pre' }, cap(JSON.stringify(req.tools.map((t) => t && t.name), null, 2), 4000))))
      }

      if (d.wire) {
        kids.push(h('details', { key: 'wire', className: 'sseye-sec' },
          h('summary', { className: 'sseye-sec-title' }, 'Wire JSON（重建，近似）'),
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
      const items = store.items
      return h('div', { className: 'sseye-panel' },
        h('div', { className: 'sseye-head' },
          h('span', { className: 'sseye-title' }, 'SSEye'),
          h('span', { className: 'sseye-count' }, items.length + ' 次调用'),
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
            items.length === 0
              ? h('div', { className: 'sseye-empty' }, '暂无捕获。发起一次对话或调用后此处出现记录。')
              : items.map((it) => h(Row, {
                  key: it.id, it: it,
                  onSelect: () => {
                    store.selectedId = it.id
                    store.detail = null
                    store.emit()
                    host.call('get', { id: it.id }).then((d) => { if (d) store.detail = d; store.emit() }).catch(() => {})
                  },
                }))),
          store.selectedId ? h(Detail) : null))
    }

    slots.inject('sidebar.footer.action', () => slots.register(
      { name: 'sidebar.footer.action', id: 'sseye-trigger', label: 'SSEye' },
      () => h('button', {
        className: 'sseye-fab',
        onClick: () => { store.open = !store.open; store.emit() },
      }, 'SSEye'),
    ))

    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'sseye-panel', label: 'SSEye' },
      () => h(Panel),
    ))
  },
}
