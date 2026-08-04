import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'compass-tasks'
const LEDGER_KEY = 'compass-ledger'
const CONFIG_KEY = 'compass-config'
const THEMES_KEY = 'compass-themes'

const QUADRANTS = { Q1: '重要且紧急', Q2: '重要不紧急', Q3: '紧急不重要', Q4: '不重要不紧急' }
const STRATEGIES = { Q1: '马上做 · 限时完成', Q2: '计划做 · 安排固定时间', Q3: '委派/压缩 · 批量处理', Q4: '删除/搁置 · 少花时间' }
const CAPITALS = { grow: { icon: '🌱', label: '积累' }, maintain: { icon: '⚖️', label: '维系' }, drain: { icon: '🔥', label: '消耗' } }

// 预设主题
const PRESET_THEMES = [
  { name: '工作', icon: '💼' },
  { name: '个人', icon: '🌱' },
  { name: '亲友', icon: '❤️' },
]

const SUGGEST_Q = {
  Q1: ['截止', 'deadline', '紧急', '今晚', '明天', '立即', '马上', '月报', '汇报', '上线', 'bug', '故障'],
  Q2: ['学习', '计划', '规划', '总结', '长期', '提升', '健身', '阅读', '复盘', '技能'],
  Q3: ['会议', '邮件', '回复', '审核', '签字', '审批', '协调', '通知'],
  Q4: ['娱乐', '游戏', '刷', '闲聊'],
}

const SAMPLE_TASKS = [
  { id: 1, title: '完成 Dashboard UI 设计', quadrant: 'Q1', theme: '工作', duration: '3h', status: 'in_progress', progress: 60, due: '2026-08-05', notes: '', capital: 'grow', sediment: '攒下全栈独立开发能力 + 一个可展示的作品', priority: 3, subtasks: [{ id: 1, title: '首页设计', status: 'done' }, { id: 2, title: '英语页面', status: 'done' }, { id: 3, title: '韩语页面', status: 'todo' }], recurring: '', created: '2026-08-01T10:00:00', updated: '2026-08-04T10:00:00' },
  { id: 2, title: '英语学习 - 每日20词', quadrant: 'Q2', theme: '学习', duration: '1h', status: 'in_progress', progress: 75, due: '', notes: '', capital: 'grow', sediment: '积累四六级词汇和地道表达', priority: 2, subtasks: [], recurring: 'daily', created: '2026-08-03T08:00:00', updated: '2026-08-04T09:00:00' },
  { id: 3, title: '韩语四十音复习', quadrant: 'Q2', theme: '学习', duration: '30m', status: 'todo', progress: 0, due: '', notes: '复习元音辅音', capital: 'grow', sediment: '韩语基础能力', priority: 2, subtasks: [], recurring: '', created: '2026-08-04T08:00:00', updated: '2026-08-04T08:00:00' },
  { id: 4, title: '回复客户邮件', quadrant: 'Q3', theme: '工作', duration: '30m', status: 'done', progress: 100, due: '2026-08-04', notes: '', capital: 'maintain', sediment: '', priority: 1, subtasks: [], recurring: '', created: '2026-08-04T09:00:00', updated: '2026-08-04T11:00:00' },
  { id: 5, title: '把日报做成可分享的海报', quadrant: 'Q4', theme: '灵感', duration: '', status: 'todo', progress: 0, due: '', notes: '', capital: 'maintain', sediment: '', priority: 1, subtasks: [], recurring: '', created: '2026-08-03T15:00:00', updated: '2026-08-03T15:00:00' },
]

const SAMPLE_LEDGER = [
  { id: 1, date: '2026-08-01', sediment: '完成产品原型设计，攒下 UX 设计能力' },
  { id: 2, date: '2026-08-02', sediment: '完成 AI 语音对话模块，攒下前端开发经验' },
  { id: 3, date: '2026-08-03', sediment: '英语学习 20 词打卡，积累词汇量' },
]

const DEFAULT_CONFIG = { northStar: '成为能独立做出成功产品的人；拥有健康的身体和松弛的内心', autoArchive: true }

function loadJSON(key, fallback) {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback } catch { return fallback }
}
function saveJSON(key, data) { localStorage.setItem(key, JSON.stringify(data)) }

export function useCompassStore() {
  const [tasks, setTasks] = useState(() => loadJSON(STORAGE_KEY, SAMPLE_TASKS))
  const [ledger, setLedger] = useState(() => loadJSON(LEDGER_KEY, SAMPLE_LEDGER))
  const [config, setConfig] = useState(() => loadJSON(CONFIG_KEY, DEFAULT_CONFIG))
  const [customThemes, setCustomThemes] = useState(() => loadJSON(THEMES_KEY, []))

  useEffect(() => { saveJSON(STORAGE_KEY, tasks) }, [tasks])
  useEffect(() => { saveJSON(LEDGER_KEY, ledger) }, [ledger])
  useEffect(() => { saveJSON(CONFIG_KEY, config) }, [config])
  useEffect(() => { saveJSON(THEMES_KEY, customThemes) }, [customThemes])

  // 所有主题 = 预设 + 自定义
  const allThemes = [...PRESET_THEMES, ...customThemes.map(t => ({ name: t, icon: '🏷️' }))]

  const addTask = useCallback((data) => {
    setTasks(prev => [...prev, {
      ...data, id: prev.length ? Math.max(...prev.map(t => t.id)) + 1 : 1,
      status: data.status || 'todo', progress: data.progress || 0,
      subtasks: data.subtasks || [], capital: data.capital || 'maintain',
      sediment: data.sediment || '', priority: data.priority || 1,
      recurring: data.recurring || '', created: new Date().toISOString(), updated: new Date().toISOString(),
    }])
  }, [])

  const updateTask = useCallback((id, patch) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, ...patch, updated: new Date().toISOString() }
      // Auto status from progress
      if (patch.progress !== undefined) {
        if (patch.progress === 100) updated.status = 'done'
        else if (patch.progress === 0 && !patch.status) updated.status = 'todo'
        else if (!patch.status) updated.status = 'in_progress'
      }
      return updated
    }))
  }, [])

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  const moveTask = useCallback((id, quadrant) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, quadrant, updated: new Date().toISOString() } : t))
  }, [])

  const addIdea = useCallback((title) => {
    addTask({ title, quadrant: 'Q4', theme: '灵感', duration: '', due: '', notes: '', capital: 'maintain', priority: 1 })
  }, [addTask])

  const cycleCapital = useCallback((id) => {
    const order = ['grow', 'maintain', 'drain']
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const next = order[(order.indexOf(t.capital || 'maintain') + 1) % 3]
      return { ...t, capital: next, updated: new Date().toISOString() }
    }))
  }, [])

  const completeGrowTask = useCallback((task) => {
    if (task.capital === 'grow' && task.sediment) {
      setLedger(prev => [...prev, { id: Date.now(), date: new Date().toISOString().slice(0, 10), sediment: task.sediment }])
    }
  }, [])

  const deleteLedgerEntry = useCallback((id) => {
    setLedger(prev => prev.filter(e => e.id !== id))
  }, [])

  const updateConfig = useCallback((patch) => {
    setConfig(prev => ({ ...prev, ...patch }))
  }, [])

  // Computed values
  const activeTasks = tasks.filter(t => t.status !== 'archived')
  const tasksWithProgress = activeTasks.filter(t => t.progress > 0)

  const energyCompass = (() => {
    const active = tasksWithProgress
    const total = active.length
    if (!total) return { grow: 0, maintain: 0, drain: 0, total: 0 }
    const grow = active.filter(t => (t.capital || 'maintain') === 'grow').length
    const drain = active.filter(t => (t.capital || 'maintain') === 'drain').length
    const maintain = total - grow - drain
    return {
      grow: Math.round(grow / total * 100),
      maintain: Math.round(maintain / total * 100),
      drain: Math.round(drain / total * 100),
      total,
    }
  })()

  const anxietyCheck = (() => {
    const q1Active = activeTasks.filter(t => t.quadrant === 'Q1')
    const warnings = []
    if (q1Active.length > 3) warnings.push(`Q1 任务有 ${q1Active.length} 个，超过 3 个，建议降级或委派`)
    if (energyCompass.total && energyCompass.grow < 20) warnings.push('积累型任务有点少——别忘了，工作是为了给自己攒东西')
    if (energyCompass.total && energyCompass.drain > 40) warnings.push('消耗型任务偏多——留意一下，是不是在纯燃烧？')
    return { ok: warnings.length === 0, warnings }
  })()

  const drainCost = (() => {
    const drains = tasks.filter(t => t.capital === 'drain' && t.status === 'done')
    const totalMin = drains.reduce((sum, t) => {
      const d = t.duration || ''
      const m = d.match(/^(\d+(?:\.\d+)?)([hmd])$/)
      if (!m) return sum
      const v = parseFloat(m[1])
      if (m[2] === 'h') return sum + v * 60
      if (m[2] === 'd') return sum + v * 480
      return sum + v
    }, 0)
    return { count: drains.length, minutes: totalMin }
  })()

  const suggestQuadrant = (title) => {
    const lower = title.toLowerCase()
    const scores = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    for (const [q, words] of Object.entries(SUGGEST_Q)) {
      for (const w of words) { if (lower.includes(w)) scores[q]++ }
    }
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
    if (best[1] === 0) return { q: 'Q2', reason: '无明显紧急信号，建议放入 Q2 计划推进' }
    const reasons = { Q1: '包含 deadline、紧急等信号', Q2: '属于学习、规划类任务', Q3: '偏向协调、审批类工作', Q4: '偏向娱乐消遣' }
    return { q: best[0], reason: reasons[best[0]] }
  }

  const addCustomTheme = useCallback((name) => {
    setCustomThemes(prev => prev.includes(name) ? prev : [...prev, name])
  }, [])

  const deleteCustomTheme = useCallback((name) => {
    setCustomThemes(prev => prev.filter(t => t !== name))
  }, [])

  return {
    tasks, activeTasks, tasksWithProgress,
    ledger, config, customThemes, allThemes,
    energyCompass, anxietyCheck, drainCost,
    addTask, updateTask, deleteTask, moveTask,
    addIdea, cycleCapital, completeGrowTask,
    deleteLedgerEntry, updateConfig, suggestQuadrant,
    addCustomTheme, deleteCustomTheme,
    QUADRANTS, STRATEGIES, CAPITALS, PRESET_THEMES,
  }
}
