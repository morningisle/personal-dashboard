import { useState, useRef } from 'react'
import { useCompassStore } from '../hooks/useCompassStore'
import { useAI } from '../contexts/AIContext'

const QUOTES = [
  { text: '做1的时候，不要去想5的事情。', author: '罗曼·莫内里' },
  { text: '你做三四月的事，在八九月自有答案。', author: '林清玄' },
  { text: '慢慢来，比较快。', author: '' },
  { text: '流水不争先。', author: '' },
  { text: '车灯只能照亮50米，但你依然能开完全程。', author: '' },
  { text: '不管前方的路有多苦，只要走的方向正确，都比站在原地更接近幸福。', author: '宫崎骏' },
  { text: '在隆冬，我终于知道，我身上有一个不可战胜的夏天。', author: '加缪' },
  { text: '你可以剪掉所有的花，但你永远不能阻止春天的到来。', author: '聂鲁达' },
]

const Q_COLORS = {
  Q1: { bg: 'from-red-100 to-red-200', header: 'from-red-300 to-red-400', text: 'text-red-700', border: 'border-red-300' },
  Q2: { bg: 'from-green-100 to-emerald-200', header: 'from-green-300 to-emerald-400', text: 'text-green-700', border: 'border-green-300' },
  Q3: { bg: 'from-blue-100 to-cyan-200', header: 'from-blue-300 to-cyan-400', text: 'text-blue-700', border: 'border-blue-300' },
  Q4: { bg: 'from-gray-100 to-gray-200', header: 'from-gray-300 to-gray-400', text: 'text-gray-600', border: 'border-gray-300' },
}

const emptyTask = { title: '', quadrant: 'Q2', theme: '', duration: '', due: '', progress: 0, priority: 1, notes: '', capital: 'maintain', sediment: '', subtasks: [] }

export default function Compass() {
  const store = useCompassStore()
  const ai = useAI() // 全局 AI 上下文
  const [showModal, setShowModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [formData, setFormData] = useState(emptyTask)
  const [themeFilter, setThemeFilter] = useState('')
  const [ideaText, setIdeaText] = useState('')
  const [toast, setToast] = useState('')
  const [draggedId, setDraggedId] = useState(null)
  const [showLedger, setShowLedger] = useState(false)
  const [newThemeName, setNewThemeName] = useState('')
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [aiSediment, setAiSediment] = useState('')

  const quote = useRef(QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const allThemeNames = store.allThemes.map(t => t.name)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const openAdd = () => { setEditingTask(null); setFormData(emptyTask); setShowModal(true) }
  const openEdit = (t) => {
    setEditingTask(t.id)
    setFormData({ title: t.title, quadrant: t.quadrant, theme: t.theme || '', duration: t.duration || '', due: t.due || '', progress: t.progress, priority: t.priority || 1, notes: t.notes || '', capital: t.capital || 'maintain', sediment: t.sediment || '', subtasks: t.subtasks || [] })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!formData.title.trim()) return
    if (editingTask) {
      store.updateTask(editingTask, formData)
      showToast('已更新')
    } else {
      store.addTask(formData)
      showToast('已添加')
    }
    setShowModal(false)
  }

  const handleComplete = (task) => {
    store.updateTask(task.id, { progress: 100 })
    store.completeGrowTask(task)
    showToast('✅ 任务完成！')
  }

  const handleSetProgress = (id, pct) => {
    const t = store.tasks.find(x => x.id === id)
    store.updateTask(id, { progress: Math.max(0, Math.min(100, pct)) })
    if (pct === 100 && t) store.completeGrowTask(t)
    showToast('进度更新')
  }

  const handleDelete = (id) => { if (confirm('确定删除这个任务吗？')) { store.deleteTask(id); showToast('已删除') } }

  const handleDrop = (quadrant) => { if (draggedId) { store.moveTask(draggedId, quadrant); showToast('已移动到 ' + store.QUADRANTS[quadrant]); setDraggedId(null) } }

  const handleIdea = (e) => {
    if (e.key === 'Enter' && ideaText.trim()) { store.addIdea(ideaText.trim()); setIdeaText(''); showToast('💡 灵感已记录') }
  }

  const filteredTasks = themeFilter ? store.activeTasks.filter(t => (t.theme || '未分类') === themeFilter) : store.activeTasks
  const ec = store.energyCompass

  // AI 智能建议象限
  const handleAiSuggestQuadrant = async () => {
    if (!formData.title.trim()) return
    
    // 如果 AI 已配置，使用 AI 建议
    if (ai.isConfigured) {
      setAiSuggesting(true)
      const northStar = store.config.northStar || '暂无设定'
      const result = await ai.chat([
        { role: 'system', content: '你是一个时间管理顾问。根据用户的北极星目标和任务描述，判断这个任务应该放在哪个象限。' },
        { role: 'user', content: `用户的北极星目标：${northStar}\n\n任务标题：${formData.title}\n任务主题：${formData.theme || '未分类'}\n预估时长：${formData.duration || '未知'}\n\n四象限定义：\n- Q1 重要且紧急：有明确截止日期且对目标很重要\n- Q2 重要不紧急：对长期目标有价值但没有紧迫期限\n- Q3 紧急不重要：需要马上处理但对目标帮助不大\n- Q4 不重要不紧急：低价值消遣或可删除的事\n\n请回复格式：Q1/Q2/Q3/Q4|简短理由（20字以内）` }
      ])
      setAiSuggesting(false)
      
      if (result) {
        const [q, reason] = result.split('|')
        const quadrant = q.trim().toUpperCase().replace(/[^Q1-4]/g, '') || 'Q2'
        setFormData({ ...formData, quadrant })
        showToast(`AI 建议 ${quadrant}：${reason?.trim() || '已更新'}`)
        return
      }
    }
    
    // 降级：使用关键词匹配
    const s = store.suggestQuadrant(formData.title)
    setFormData({ ...formData, quadrant: s.q })
    showToast(`建议 ${s.q}：${s.reason}`)
  }

  // AI 生成资本沉淀
  const handleAiSuggestSediment = async () => {
    if (!formData.title.trim() || !ai.isConfigured) return
    setAiSediment('思考中...')
    
    const result = await ai.chat([
      { role: 'system', content: '你是一个人生教练。帮助用户思考每件事能在他们身上留下什么有价值的积累。' },
      { role: 'user', content: `任务：${formData.title}\n主题：${formData.theme || '未分类'}\n资本属性：${formData.capital === 'grow' ? '积累型' : formData.capital === 'drain' ? '消耗型' : '维系型'}\n\n请用一句话（20字以内）描述这件事会在用户身上留下什么具体的积累/沉淀。要具体、有启发性。例如："积累了项目复盘的方法论"、"维系了与好友的情感连接"。` }
    ])
    
    if (result) {
      setAiSediment(result)
      setFormData({ ...formData, sediment: result })
    } else {
      setAiSediment('')
    }
  }

  return (
    <div className="space-y-4 pb-4">
      {/* North Star */}
      <div className="clay-card p-4 bg-gradient-to-br from-amber-100 to-orange-100">
        <div className="flex items-start gap-2">
          <span className="text-lg">🧭</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-700">我的北极星</p>
            <p className="text-sm text-amber-800 mt-0.5">{store.config.northStar || <span className="italic text-amber-400">点右上角设置你的长期目标</span>}</p>
          </div>
          <button onClick={() => setShowSettings(true)} className="clay-btn w-8 h-8 bg-amber-200 flex items-center justify-center text-xs">⚙</button>
        </div>
      </div>

      {/* Anxiety Banner */}
      {!store.anxietyCheck.ok && (
        <div className="clay-card p-3 bg-gradient-to-r from-red-100 to-pink-100 border-l-4 border-red-400">
          <p className="text-xs font-bold text-red-700">⚠️ {store.anxietyCheck.warnings.join('；')}</p>
        </div>
      )}

      {/* Energy Compass */}
      {ec.total > 0 && (
        <div className="clay-card p-4 bg-gradient-to-br from-indigo-100 to-purple-100">
          <p className="text-xs font-bold text-indigo-700 mb-2">⚡ 精力投向 · 已投入 {ec.total} 件</p>
          <div className="clay-progress h-4 bg-indigo-100 flex overflow-hidden">
            {ec.grow > 0 && <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: `${ec.grow}%` }} />}
            {ec.maintain > 0 && <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400" style={{ width: `${ec.maintain}%` }} />}
            {ec.drain > 0 && <div className="h-full bg-gradient-to-r from-red-400 to-pink-400" style={{ width: `${ec.drain}%` }} />}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-green-600 font-bold">🌱 积累 {ec.grow}%</span>
            <span className="text-[10px] text-amber-600 font-bold">⚖️ 维系 {ec.maintain}%</span>
            <span className="text-[10px] text-red-600 font-bold">🔥 消耗 {ec.drain}%</span>
          </div>
        </div>
      )}

      {/* Ransom Ledger Toggle */}
      <button onClick={() => setShowLedger(!showLedger)} className="w-full clay-btn p-3 bg-gradient-to-br from-green-200 to-emerald-200 flex items-center justify-between">
        <span className="text-sm font-bold text-green-700">💰 赎身进度 · 生产资料账本</span>
        <span className="text-xs text-green-500">{store.ledger.length} 项沉淀 {showLedger ? '▲' : '▼'}</span>
      </button>
      {showLedger && (
        <div className="clay-card p-4 bg-gradient-to-br from-green-50 to-emerald-50 space-y-2">
          {store.ledger.length === 0 ? (
            <p className="text-xs text-green-500 italic">还没有积累入账——完成一件 🌱 积累型任务，它就会永久沉淀在这里。</p>
          ) : (
            <>
              <p className="text-xs text-green-600 font-bold">🌱 你已攒下 {store.ledger.length} 样东西：</p>
              {store.ledger.slice(-5).reverse().map(e => (
                <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-green-100 last:border-0">
                  <span className="text-[10px] text-green-400 whitespace-nowrap">{e.date}</span>
                  <span className="text-xs text-green-700 flex-1">{e.sediment}</span>
                  <button onClick={() => store.deleteLedgerEntry(e.id)} className="text-red-300 text-xs hover:text-red-500">✕</button>
                </div>
              ))}
            </>
          )}
          {store.drainCost.count > 0 && (
            <p className="text-[10px] text-red-500 mt-2 pt-2 border-t border-red-100">
              🔥 已烧掉 {store.drainCost.count} 件消耗型任务{store.drainCost.minutes > 0 ? `（约 ${(store.drainCost.minutes / 60).toFixed(1)} 小时）` : ''}——它们没有在你身上留下任何东西。
            </p>
          )}
        </div>
      )}

      {/* Theme Filter + Add */}
      <div className="flex items-center gap-2">
        <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} className="clay-input flex-1 px-3 py-2 text-xs bg-white/80 text-gray-600">
          <option value="">全部主题</option>
          {allThemeNames.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={openAdd} className="clay-btn px-4 py-2 bg-gradient-to-br from-purple-300 to-pink-300 text-sm font-bold text-white">+ 添加任务</button>
      </div>

      {/* Quadrant Board - 2x2 Grid on mobile */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(store.QUADRANTS).map(([q, label]) => {
          const qTasks = filteredTasks.filter(t => t.quadrant === q)
          const c = Q_COLORS[q]
          return (
            <div
              key={q}
              className={`clay-card p-3 bg-gradient-to-br ${c.bg} min-h-[200px] transition-all ${draggedId ? 'ring-2 ring-purple-300' : ''}`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(q)}
            >
              {/* Column Header */}
              <div className={`bg-gradient-to-r ${c.header} rounded-2xl px-3 py-2 mb-2 flex items-center justify-between`}>
                <span className="text-xs font-bold text-white">{q} {label}</span>
                <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full text-white font-bold">{qTasks.length}</span>
              </div>
              <p className="text-[9px] text-gray-500 font-medium mb-2 px-1">{store.STRATEGIES[q]}</p>

              {/* Task Cards */}
              <div className="space-y-2">
                {qTasks.map(task => {
                  const cap = store.CAPITALS[task.capital || 'maintain']
                  const subDone = (task.subtasks || []).filter(s => s.status === 'done').length
                  const subTotal = (task.subtasks || []).length
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className={`clay-card p-2.5 bg-white/80 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] ${task.status === 'done' ? 'opacity-60' : ''}`}
                      style={{ borderRadius: '16px' }}
                    >
                      <p className={`text-xs font-bold text-gray-800 leading-tight mb-1`}>{task.title}</p>

                      {/* Meta badges */}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        <button onClick={() => store.cycleCapital(task.id)} className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${task.capital === 'grow' ? 'bg-green-100 text-green-700' : task.capital === 'drain' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`} title="点击切换">
                          {cap.icon} {cap.label}
                        </button>
                        {task.duration && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">⏱{task.duration}</span>}
                        {task.due && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">📅{task.due}</span>}
                        {task.theme && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">{task.theme}</span>}
                      </div>

                      {/* Sediment line */}
                      {task.sediment && (
                        <p className="text-[9px] text-green-600 italic bg-green-50 border-l-2 border-green-300 pl-1.5 py-0.5 mb-1.5 rounded-r">{cap.icon} {task.sediment}</p>
                      )}

                      {/* Subtasks */}
                      {subTotal > 0 && <p className="text-[9px] text-gray-400 mb-1">✅ {subDone}/{subTotal} 子任务</p>}

                      {/* Progress bar */}
                      <div className="clay-progress h-1.5 bg-gray-100 mb-1.5">
                        <div className="clay-progress-bar h-full bg-gradient-to-r from-indigo-400 to-purple-400" style={{ width: `${task.progress}%` }} />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => openEdit(task)} className="text-[9px] px-2 py-1 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all">编辑</button>
                        <button onClick={() => handleSetProgress(task.id, task.progress + 10)} className="text-[9px] px-2 py-1 rounded-xl bg-blue-100 text-blue-600 font-bold hover:bg-blue-200 transition-all">+10%</button>
                        {task.progress < 100 && (
                          <button onClick={() => handleComplete(task)} className="text-[9px] px-2 py-1 rounded-xl bg-green-100 text-green-600 font-bold hover:bg-green-200 transition-all">✓完成</button>
                        )}
                        <button onClick={() => handleDelete(task.id)} className="text-[9px] px-2 py-1 rounded-xl bg-red-50 text-red-400 font-bold hover:bg-red-100 transition-all">✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Inspiration Capture */}
      <div className="clay-card p-3 bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center gap-2">
        <span className="text-lg">💡</span>
        <input
          value={ideaText}
          onChange={e => setIdeaText(e.target.value)}
          onKeyDown={handleIdea}
          placeholder="想到什么？随手记下来..."
          className="clay-input flex-1 px-3 py-2 text-xs bg-white/60 text-gray-600"
        />
      </div>

      {/* Daily Quote */}
      <div className="text-center py-2">
        <p className="text-xs text-gray-400 italic">「{quote.current.text}」</p>
        {quote.current.author && <p className="text-[10px] text-gray-300 mt-0.5">—— {quote.current.author}</p>}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-gray-800 text-white text-xs font-bold shadow-lg">
          {toast}
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 drawer-overlay" />
          <div className="relative w-full max-w-lg bg-gradient-to-b from-purple-50 to-pink-50 rounded-t-[32px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-purple-100">
              <h3 className="text-base font-bold text-purple-700">{editingTask ? '编辑任务' : '添加任务'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 clay-btn bg-purple-200 flex items-center justify-center text-purple-600 text-sm font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="任务标题" className="clay-input w-full px-4 py-3 text-sm bg-white/80 text-gray-700" />
              <div className="grid grid-cols-2 gap-2">
                <select value={formData.quadrant} onChange={e => setFormData({...formData, quadrant: e.target.value})} className="clay-input px-3 py-2 text-xs bg-white/80 text-gray-600">
                  {Object.entries(store.QUADRANTS).map(([q, l]) => <option key={q} value={q}>{q} {l}</option>)}
                </select>
                <input value={formData.due} onChange={e => setFormData({...formData, due: e.target.value})} type="date" className="clay-input px-3 py-2 text-xs bg-white/80 text-gray-600" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 mb-1.5">主题</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {store.allThemes.map(th => (
                      <button
                        key={th.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, theme: th.name })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          formData.theme === th.name
                            ? 'bg-gradient-to-br from-purple-300 to-pink-300 text-white clay-tab-active'
                            : 'bg-white/60 text-gray-500 hover:bg-white/80'
                        }`}
                      >
                        {th.icon} {th.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newThemeName}
                      onChange={e => setNewThemeName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newThemeName.trim()) {
                          store.addCustomTheme(newThemeName.trim())
                          setFormData({ ...formData, theme: newThemeName.trim() })
                          setNewThemeName('')
                        }
                      }}
                      placeholder="添加新主题..."
                      className="clay-input flex-1 px-3 py-2 text-xs bg-white/80 text-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newThemeName.trim()) {
                          store.addCustomTheme(newThemeName.trim())
                          setFormData({ ...formData, theme: newThemeName.trim() })
                          setNewThemeName('')
                        }
                      }}
                      className="clay-btn px-3 py-2 bg-amber-200 text-xs font-bold text-amber-700"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="预估时长 2h/30m" className="clay-input px-3 py-2 text-xs bg-white/80 text-gray-600" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">进度 ({formData.progress}%)</p>
                  <input type="range" min="0" max="100" step="10" value={formData.progress} onChange={e => setFormData({...formData, progress: parseInt(e.target.value)})} className="w-full accent-purple-400" />
                </div>
                <select value={formData.priority} onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})} className="clay-input px-3 py-2 text-xs bg-white/80 text-gray-600">
                  <option value={1}>★ 普通</option>
                  <option value={2}>★★ 重要</option>
                  <option value={3}>★★★ 紧急</option>
                </select>
              </div>

              {/* Capital Picker */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5">资本属性 — 这件事会在你身上留下什么？</p>
                <div className="flex gap-2">
                  {Object.entries(store.CAPITALS).map(([key, val]) => (
                    <button key={key} onClick={() => setFormData({...formData, capital: key})}
                      className={`flex-1 p-2 rounded-2xl text-xs font-bold transition-all ${formData.capital === key ? 'clay-tab-active' : 'bg-white/50'} ${key === 'grow' ? (formData.capital === key ? 'bg-green-200 text-green-700' : 'text-green-500') : key === 'drain' ? (formData.capital === key ? 'bg-red-200 text-red-700' : 'text-red-400') : (formData.capital === key ? 'bg-amber-200 text-amber-700' : 'text-amber-500')}`}
                    >
                      {val.icon} {val.label}
                    </button>
                  ))}
                </div>
              </div>

              <input value={formData.sediment} onChange={e => setFormData({...formData, sediment: e.target.value})} placeholder="资本沉淀：这件事会让你积累什么？" className="clay-input w-full px-4 py-2 text-xs bg-white/80 text-gray-600" />
              {ai.isConfigured && (
                <button 
                  onClick={handleAiSuggestSediment} 
                  disabled={ai.isLoading || !formData.title.trim()}
                  className="clay-btn w-full py-2 bg-gradient-to-br from-green-200 to-emerald-200 text-xs font-bold text-green-700 text-center disabled:opacity-50"
                >
                  {ai.isLoading && aiSediment === '思考中...' ? '🌱 AI 思考中...' : '🌱 AI 帮我思考资本沉淀'}
                </button>
              )}
              {aiSediment && <p className="text-[10px] text-green-600 italic">💡 {aiSediment}</p>}

              {/* Suggest button */}
              <button 
                onClick={handleAiSuggestQuadrant}
                disabled={aiSuggesting || !formData.title.trim()} 
                className="clay-btn w-full py-2 bg-gradient-to-br from-amber-200 to-yellow-200 text-xs font-bold text-amber-700 text-center disabled:opacity-50"
              >
                {aiSuggesting ? '💡 AI 分析中...' : ai.isConfigured ? '💡 AI 智能建议象限' : '💡 智能建议象限'}
              </button>

              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="备注..." rows={2} className="clay-input w-full px-4 py-2 text-xs bg-white/80 text-gray-600 resize-none" />
            </div>
            <div className="p-4 border-t border-purple-100 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="clay-btn px-4 py-2.5 bg-gray-200 text-xs font-bold text-gray-600">取消</button>
              <button onClick={handleSave} className="clay-btn px-6 py-2.5 bg-gradient-to-br from-purple-400 to-pink-400 text-xs font-bold text-white">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0 drawer-overlay" />
          <div className="relative w-[90%] max-w-md clay-card p-6 bg-gradient-to-br from-white to-amber-50 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-amber-700">⚙️ 设置</h3>
            <div>
              <p className="text-xs font-bold text-amber-600 mb-1">🧭 我的北极星</p>
              <textarea
                value={store.config.northStar}
                onChange={e => store.updateConfig({ northStar: e.target.value })}
                placeholder="写下你的长期个人目标..."
                rows={3}
                className="clay-input w-full px-3 py-2 text-xs bg-white/80 text-gray-700 resize-none"
              />
              <p className="text-[10px] text-amber-400 mt-1">AI 据此判断每件事的意义</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={store.config.autoArchive} onChange={e => store.updateConfig({ autoArchive: e.target.checked })} className="accent-amber-400" />
              <span className="text-xs text-gray-600">完成任务次日自动归档</span>
            </div>
            <div className="flex justify-end">
              <button onClick={() => { setShowSettings(false); showToast('设置已保存') }} className="clay-btn px-6 py-2.5 bg-gradient-to-br from-amber-300 to-orange-300 text-xs font-bold text-amber-700">保存设置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
