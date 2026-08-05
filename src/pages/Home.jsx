import { useState, useEffect, useRef, useCallback } from 'react'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useCompassStore } from '../hooks/useCompassStore'
import { useAI } from '../contexts/AIContext'

const moodEmojis = [
  { emoji: './icons/mood-happy.png', label: '喜', color: 'from-green-200 to-green-300' },
  { emoji: './icons/mood-content.png', label: '乐', color: 'from-blue-200 to-blue-300' },
  { emoji: './icons/mood-sad.png', label: '哀', color: 'from-purple-200 to-purple-300' },
  { emoji: './icons/mood-angry.png', label: '怒', color: 'from-red-200 to-red-300' },
  { emoji: './icons/mood-confused.png', label: '疑惑', color: 'from-amber-200 to-amber-300' },
]

const aiQuestions = [
  "hi~Papagan，今天最有成就感的一件事是什么？",
  "工作中遇到了什么挑战？你是怎么应对的？",
  "生活中有没有遇到什么启发或困扰？",
  "今天有没有学到什么新东西？",
  "明天你最想优先完成的事情是什么？",
]

const weekMood = [
  { day: '一', mood: './icons/mood-content.png', score: 8 },
  { day: '二', mood: './icons/mood-happy.png', score: 9 },
  { day: '三', mood: './icons/mood-flat.png', score: 5 },
  { day: '四', mood: './icons/mood-content.png', score: 7 },
  { day: '五', mood: './icons/mood-happy.png', score: 9 },
  { day: '六', mood: './icons/mood-content.png', score: 8 },
  { day: '日', mood: './icons/mood-confused.png', score: 0 },
]

const sampleReport = {
  work: { highlights: ['完成了 Dashboard UI 设计稿', '整理了英语学习资料'], improvements: ['时间管理可以更高效'] },
  life: { emotion: '整体心情良好，下午有些疲惫', insight: '适当休息对效率很重要' },
  quote: '「每天进步一点点，就是最好的自己。」',
  actionItems: ['早起30分钟背单词', '完成韩语四十音复习', '复盘今日学习内容'],
}

export default function Home() {
  const [selectedMood, setSelectedMood] = useState(null)
  const [showAiChat, setShowAiChat] = useState(false)
  const [chatStep, setChatStep] = useState(0)
  const [chatMessages, setChatMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false) // 语音模式
  const [callPhase, setCallPhase] = useState('idle') // idle | listening | thinking | speaking
  const [aiReport, setAiReport] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [detectedTask, setDetectedTask] = useState(null)
  const [taskAdded, setTaskAdded] = useState(false)
  const [showReportDetail, setShowReportDetail] = useState(false)
  const chatEndRef = useRef(null)
  const callLoopRef = useRef(false)
  const processingRef = useRef(false)
  const voiceModeRef = useRef(false)
  const chatStepRef = useRef(0)
  const chatMessagesRef = useRef([])

  // 语音合成
  const tts = useTextToSpeech()
  // 罗盘数据
  const compass = useCompassStore()
  // 全局 AI
  const ai = useAI()

  // 同步 ref
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])
  useEffect(() => { chatStepRef.current = chatStep }, [chatStep])
  useEffect(() => { chatMessagesRef.current = chatMessages }, [chatMessages])

  const handleVoiceUtterance = useCallback(async (text) => {
    if (processingRef.current || !callLoopRef.current) return
    processingRef.current = true
    setCallPhase('thinking')

    const userMsg = { role: 'user', text }
    const currentMsgs = chatMessagesRef.current
    setChatMessages(prev => [...prev, userMsg])
    setCallPhase('speaking')

    const step = chatStepRef.current
    if (step < aiQuestions.length - 1) {
      setChatStep(prev => prev + 1)
      let nextQuestion = aiQuestions[step + 1]
      if (ai.isConfigured) {
        const conversationSoFar = [...currentMsgs, userMsg].map(m => `${m.role}: ${m.text}`).join('\n')
        try {
          const nextQ = await ai.chat([
            { role: 'system', content: '你是一个每日复盘引导者。根据用户的回答，提出下一个引导性问题。问题要简短、具体、有温度。只输出问题本身，不要其他内容。' },
            { role: 'user', content: `对话记录：\n${conversationSoFar}\n\n预设问题池：${aiQuestions.join('、')}\n\n请基于用户刚才的回答，提出下一个问题。可以参照预设问题池，但最好根据用户的回答灵活调整。` }
          ])
          if (nextQ) nextQuestion = nextQ
        } catch (e) {}
      }

      setChatMessages(prev => [...prev, { role: 'ai', text: nextQuestion }])
      processingRef.current = false
      setCallPhase('idle')

      if (callLoopRef.current && voiceModeRef.current) {
        tts.speak(nextQuestion, {
          onEnd: () => {
            setTimeout(() => {
              if (callLoopRef.current && voiceModeRef.current) {
                setCallPhase('listening')
                voiceRecognitionInternal.startListening()
              }
            }, 300)
          }
        })
      }
    } else {
      setShowReport(true)
      setDetectedTask(detectTaskFromConversation([...currentMsgs, userMsg]))
      setTaskAdded(false)
      setCallPhase('idle')
      processingRef.current = false
      callLoopRef.current = false
      if (ai.isConfigured) {
        generateAiReport([...currentMsgs, userMsg])
        const doneText = '好的，复盘完成！我正在为你生成今天的复盘报告。'
        setChatMessages(prev => [...prev, { role: 'ai', text: doneText }])
        if (voiceModeRef.current) tts.speak(doneText)
      }
    }
  }, [ai, tts])

  // 语音识别
  const voiceRecognitionInternal = useVoiceRecognition({
    onUtteranceComplete: (text) => {
      handleVoiceUtterance(text)
    },
    continuous: false,
  })
  const voiceRecognition = voiceRecognitionInternal

  // 今日有进度推进的任务
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayTasks = compass.activeTasks.filter(t => {
    if (t.progress <= 0) return false
    const updatedDate = (t.updated || '').slice(0, 10)
    return updatedDate === todayStr
  })
  const reportDetailTasks = todayTasks.length > 0 ? todayTasks : compass.activeTasks.slice(0, 3)
  const workTasks = reportDetailTasks.filter(t => t.theme === '工作')
  const personalTasks = reportDetailTasks.filter(t => t.theme === '个人')
  const familyTasks = reportDetailTasks.filter(t => t.theme === '亲友')
  const otherTasks = reportDetailTasks.filter(t => !['工作', '个人', '亲友'].includes(t.theme))

  const formatTaskDue = (due) => due || '未设置截止日期'

  const formatReportTaskLine = (task, index) => {
    const done = task.status === 'done' || task.progress === 100
    const progress = done ? '' : `${task.progress || 0}%`
    const notes = task.notes ? `，${task.notes}` : ''
    const due = task.due ? `(截止${task.due})` : ''
    const subtasks = (task.subtasks || [])
      .filter(subtask => subtask.status === 'done')
      .map(subtask => `\nL完成子任务「${subtask.title}」;`)
      .join('')
    return `${index + 1}、${done ? '完成' : '推进'}「${task.title}」${progress}${notes}${due};${subtasks}`
  }

  const buildDailyReportText = () => {
    const sections = [
      ['工作相关', workTasks],
      ['个人相关', personalTasks],
      ['亲友相关', familyTasks],
      ['其他相关', otherTasks],
    ].filter(([, tasks]) => tasks.length > 0)

    return [
      '今日日报',
      ...sections.flatMap(([title, tasks]) => [
        `###${title}`,
        ...tasks.map(formatReportTaskLine),
      ]),
    ].join('\n')
  }

  const copyDailyReport = async () => {
    await navigator.clipboard.writeText(buildDailyReportText())
  }

  const detectTaskFromConversation = (conversation) => {
    const userLines = conversation.filter(m => m.role === 'user').map(m => m.text)
    const keywords = ['任务', '要做', '需要', '计划', '明天', '截止', 'deadline', '完成', '推进', '整理', '复习', '学习']
    const line = [...userLines].reverse().find(text => keywords.some(keyword => text.includes(keyword)))
    if (!line) return null
    const title = line.replace(/^(我|今天|明天|还)?(要|需要|计划|准备|想)?/, '').replace(/[。！？!?,，；;].*$/, '').trim().slice(0, 36) || line.slice(0, 36)
    const suggestion = compass.suggestQuadrant(title)
    const due = line.includes('明天') ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : ''
    return {
      title,
      quadrant: suggestion.q,
      theme: line.includes('学习') || line.includes('复习') ? '个人' : '工作',
      duration: '',
      due,
      notes: `来自 ${todayStr} AI 电话复盘：${line}`,
      progress: 0,
      priority: line.includes('截止') || line.includes('deadline') || line.includes('明天') ? 3 : 2,
      capital: line.includes('学习') || line.includes('复习') || line.includes('整理') ? 'grow' : 'maintain',
    }
  }

  const exportConversation = () => {
    const content = [
      `AI 电话复盘 · ${todayStr}`,
      '',
      ...chatMessages.map(m => `${m.role === 'ai' ? 'AI' : '我'}：${m.text}`),
      aiReport ? `\n今日复盘报告：\n${aiReport}` : '',
    ].filter(Boolean).join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AI电话复盘-${todayStr}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const addDetectedTask = () => {
    if (!detectedTask) return
    compass.addTask(detectedTask)
    setTaskAdded(true)
  }

  // 收集所有对话内容，让 AI 生成动态报告
  const generateAiReport = async (conversation) => {
    setReportLoading(true)
    const conversationText = conversation.map(m => `${m.role === 'ai' ? 'AI' : '用户'}: ${m.text}`).join('\n')
    
    // 获取罗盘今日任务作为上下文
    const taskContext = todayTasks.length > 0
      ? `\n\n今日罗盘任务：\n${todayTasks.map(t => `- [${t.theme}] ${t.title} (进度${t.progress}%)`).join('\n')}`
      : ''
    
    const result = await ai.chat([
      { role: 'system', content: '你是一个温暖的每日复盘助手。基于用户的回答，生成一份简洁但有温度的复盘报告。用中文回复。' },
      { role: 'user', content: `以下是一次每日复盘对话的内容：\n\n${conversationText}${taskContext}\n\n请生成复盘报告，格式如下：\n🎯 工作成果（总结用户今天做了什么，有什么亮点）\n💝 生活感知（关注用户的情绪和状态）\n✨ 今日金句（一句鼓励的话）\n📌 明日建议（2-3个具体的行动建议）\n\n保持简洁温暖，200字以内。` }
    ])
    setAiReport(result || '报告生成失败，请检查 AI 配置。')
    setReportLoading(false)
  }

  const handleSend = async () => {
    if (!userInput.trim()) return
    const newMsgs = [
      ...chatMessages,
      { role: 'ai', text: aiQuestions[chatStep] },
      { role: 'user', text: userInput },
    ]
    setChatMessages(newMsgs)
    setUserInput('')
    if (chatStep < aiQuestions.length - 1) {
      setChatStep(chatStep + 1)
      // 如果配置了 AI，让 AI 根据用户回答动态生成下一个问题
      if (ai.isConfigured) {
        const conversationSoFar = newMsgs.map(m => `${m.role}: ${m.text}`).join('\n')
        const nextQ = await ai.chat([
          { role: 'system', content: '你是一个每日复盘引导者。根据用户的回答，提出下一个引导性问题。问题要简短、具体、有温度。只输出问题本身，不要其他内容。' },
          { role: 'user', content: `对话记录：\n${conversationSoFar}\n\n预设问题池：${aiQuestions.join('、')}\n\n请基于用户刚才的回答，提出下一个问题。可以参照预设问题池，但最好根据用户的回答灵活调整。` }
        ])
        const question = nextQ || aiQuestions[chatStep + 1]
        setChatMessages(prev => [...prev, { role: 'ai', text: question }])
        if (voiceMode) tts.speak(question)
      } else {
        setTimeout(() => {
          const nextQuestion = aiQuestions[chatStep + 1]
          setChatMessages(prev => [...prev, { role: 'ai', text: nextQuestion }])
          if (voiceMode) tts.speak(nextQuestion)
        }, 500)
      }
    } else {
      setShowReport(true)
      setDetectedTask(detectTaskFromConversation(newMsgs))
      setTaskAdded(false)
      // 生成 AI 报告
      if (ai.isConfigured) {
        generateAiReport(newMsgs)
      }
      if (voiceMode) {
        tts.speak('好的，复盘完成！我正在为你生成今天的复盘报告。')
      }
    }
  }

  const startChat = () => {
    setShowAiChat(true)
    setChatStep(0)
    chatStepRef.current = 0
    chatMessagesRef.current = [{ role: 'ai', text: aiQuestions[0] }]
    setChatMessages([{ role: 'ai', text: aiQuestions[0] }])
    setShowReport(false)
    setVoiceMode(false)
    voiceModeRef.current = false
    setAiReport('')
    setDetectedTask(null)
    setTaskAdded(false)
    setCallPhase('idle')
    callLoopRef.current = false
    processingRef.current = false
  }

  const handleVoiceToggle = () => {
    const newVoiceMode = !voiceMode
    setVoiceMode(newVoiceMode)
    voiceModeRef.current = newVoiceMode
    if (newVoiceMode) {
      // 开启语音模式：启动通话循环
      callLoopRef.current = true
      setCallPhase('speaking')
      setChatMessages(prev => prev.map(m => m))
      // 朗读当前 AI 消息后监听
      const lastMsg = chatMessagesRef.current[chatMessagesRef.current.length - 1]
      if (lastMsg?.role === 'ai') {
        tts.speak(lastMsg.text, {
          onEnd: () => {
            setTimeout(() => {
              if (callLoopRef.current && voiceModeRef.current) {
                setCallPhase('listening')
                voiceRecognitionInternal.startListening()
              }
            }, 300)
          }
        })
      }
    } else {
      // 关闭语音模式
      callLoopRef.current = false
      setCallPhase('idle')
      tts.stop()
      voiceRecognitionInternal.stopListening()
    }
  }

  // 滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  return (
    <div className="space-y-4 pb-4">
      {/* Greeting + IP Character */}
      <div className="relative space-y-4">
        <div className="clay-card p-5 bg-gradient-to-br from-pink-200 to-purple-200 w-[75%] min-h-[98px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center clay-glow overflow-hidden">
              <img src="./icons/mood-happy.png" alt="打招呼" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Papagan，欢迎回来。</p>
              <h2 className="text-base font-bold text-gray-700">世界仍然是一个在温柔地等待著你成熟的果园。</h2>
            </div>
          </div>
          <p className="text-xs text-purple-600/70 mt-1">2026年8月4日 · 星期二 · 已连续打卡 12 天 🔥</p>
        </div>

        {/* Mood Checkin */}
        <div className="clay-card mood-check-card p-4 bg-gradient-to-br from-amber-100 to-amber-200 w-[75%] min-h-[136px]">
          <p className="text-sm font-bold text-amber-700 mb-3">💫 今日心情打卡</p>
          <div className="flex justify-between gap-2">
            {moodEmojis.map((m, i) => (
              <button
                key={i}
                onClick={() => setSelectedMood(i)}
                className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  selectedMood === i
                    ? `bg-gradient-to-b ${m.color} clay-tab-active scale-110`
                    : 'hover:bg-white/40'
                }`}
              >
                <img src={m.emoji} alt={m.label} className={`w-10 h-10 object-contain ${selectedMood === i ? 'animate-bounce-clay' : ''}`} />
                <span className="text-[10px] font-bold text-gray-600">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <img
          src="./icons/home-hero.jpg"
          alt="趴着的木瓜"
          className="absolute right-0 bottom-0 max-h-full w-[25%] object-contain pointer-events-none z-10"
          style={{ objectPosition: 'right bottom' }}
        />
      </div>

      {/* AI Review Button */}
      <button
        onClick={startChat}
        className="w-full clay-btn p-5 bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-between"
        style={{ borderRadius: '28px' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-2xl animate-float">
            🤖
          </div>
          <div className="text-left">
            <p className="text-base font-bold text-white">跟 AI 打电话复盘</p>
            <p className="text-xs text-white/80">AI 引导你回顾今天的工作与生活</p>
          </div>
        </div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      {/* AI Chat Modal */}
      {showAiChat && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 drawer-overlay" onClick={() => setShowAiChat(false)} />
          <div
            className="relative w-full max-w-lg bg-gradient-to-b from-purple-50 to-pink-50 rounded-t-[32px] max-h-[75vh] flex flex-col"
            style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' }}
          >
            {/* Chat Header */}
            <div className="p-4 flex items-center justify-between border-b border-purple-100">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-lg ${voiceMode ? 'animate-pulse-soft' : ''}`}>
                  🤖
                </div>
                <span className="font-bold text-purple-700">AI 复盘助手</span>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-soft" />
                {voiceMode && <span className="text-xs text-purple-500 font-medium">🎙 语音模式</span>}
                {callPhase === 'listening' && <span className="text-xs text-green-500 font-medium animate-pulse-soft">正在聆听...</span>}
                {callPhase === 'thinking' && <span className="text-xs text-amber-500 font-medium">思考中...</span>}
                {callPhase === 'speaking' && <span className="text-xs text-blue-500 font-medium">AI 回复中...</span>}
              </div>
              <div className="flex items-center gap-2">
                {/* 语音模式切换 */}
                <button
                  onClick={handleVoiceToggle}
                  className={`w-8 h-8 clay-btn flex items-center justify-center text-sm font-bold transition-all ${
                    voiceMode ? 'bg-gradient-to-br from-green-300 to-emerald-300 text-green-700' : 'bg-purple-200 text-purple-600'
                  }`}
                  title={voiceMode ? '关闭语音' : '开启语音'}
                >
                  {voiceMode ? '🎙' : '🔇'}
                </button>
                <button
                  onClick={() => {
                    setShowAiChat(false)
                    callLoopRef.current = false
                    setCallPhase('idle')
                    tts.stop()
                    voiceRecognitionInternal.stopListening()
                  }}
                  className="w-8 h-8 clay-btn bg-purple-200 flex items-center justify-center text-purple-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] p-3 text-sm leading-relaxed ${
                      msg.role === 'ai'
                        ? 'bg-gradient-to-br from-purple-200 to-pink-200 text-purple-800 rounded-[20px] rounded-bl-md clay-card'
                        : 'bg-gradient-to-br from-blue-200 to-blue-300 text-blue-800 rounded-[20px] rounded-br-md clay-card'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {/* 语音识别实时显示 */}
              {voiceMode && voiceRecognitionInternal.interimTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] p-3 text-sm bg-blue-100 text-blue-600 rounded-[20px] rounded-br-md clay-card opacity-60">
                    {voiceRecognitionInternal.interimTranscript}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
              {showReport && (
                <div className="clay-card p-4 bg-gradient-to-br from-green-100 to-emerald-100 space-y-3 mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-green-700">📋 今日复盘报告</p>
                    <button
                      onClick={exportConversation}
                      className="clay-btn px-3 py-1.5 bg-green-200 text-[10px] font-bold text-green-700"
                    >
                      导出对话
                    </button>
                  </div>
                  {reportLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="animate-pulse">AI 正在生成报告...</span>
                    </div>
                  ) : aiReport ? (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiReport}</div>
                  ) : (
                    // 降级：无 AI 时使用静态报告
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-bold text-green-600">🎯 工作成果</p>
                        {sampleReport.work.highlights.map((h, i) => (
                          <p key={i} className="text-xs text-green-700 pl-3">✅ {h}</p>
                        ))}
                        {sampleReport.work.improvements.map((h, i) => (
                          <p key={i} className="text-xs text-amber-700 pl-3">⚡ {h}</p>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-green-600">💝 生活感知</p>
                        <p className="text-xs text-green-700 pl-3">{sampleReport.life.emotion}</p>
                        <p className="text-xs text-green-700 pl-3">💡 {sampleReport.life.insight}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-green-600">✨ 今日金句</p>
                        <p className="text-xs text-purple-700 pl-3 italic">{sampleReport.quote}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-green-600">📌 明日 Action</p>
                        {sampleReport.actionItems.map((a, i) => (
                          <p key={i} className="text-xs text-blue-700 pl-3">→ {a}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {detectedTask && (
                    <div className="clay-card p-3 bg-white/70 space-y-2">
                      <p className="text-xs font-bold text-emerald-700">检测到你提到了一个任务，要加入罗盘吗？</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><span className="font-bold text-gray-700">任务：</span>{detectedTask.title}</p>
                        <p><span className="font-bold text-gray-700">主题：</span>{detectedTask.theme}</p>
                        <p><span className="font-bold text-gray-700">截止：</span>{formatTaskDue(detectedTask.due)}</p>
                        <p className="line-clamp-2"><span className="font-bold text-gray-700">备注：</span>{detectedTask.notes}</p>
                      </div>
                      {taskAdded ? (
                        <p className="text-xs font-bold text-green-600">已加入罗盘。</p>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={addDetectedTask} className="clay-btn flex-1 py-2 bg-emerald-200 text-xs font-bold text-emerald-700">加入罗盘</button>
                          <button onClick={() => setDetectedTask(null)} className="clay-btn flex-1 py-2 bg-gray-100 text-xs font-bold text-gray-500">先不加入</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Input */}
            {!showReport && (
              <div className="p-4 border-t border-purple-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="说说你的想法..."
                    className="clay-input flex-1 px-4 py-3 bg-gradient-to-b from-white to-purple-50 text-sm text-gray-700"
                  />
                  <button
                    onClick={handleSend}
                    className="clay-btn w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-lg"
                  >
                    ➤
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7-Day Mood Trend */}
      <div className="clay-card p-4 bg-gradient-to-br from-blue-100 to-cyan-100">
        <p className="text-sm font-bold text-blue-700 mb-3">📈 7天复盘趋势</p>
        <div className="flex items-end justify-between gap-1 h-20">
          {weekMood.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <img src={d.mood} alt={d.day} className="w-6 h-6 object-contain" />
              <div className="w-full relative">
                <div
                  className="w-full rounded-xl bg-gradient-to-t from-blue-300 to-cyan-300 transition-all duration-500"
                  style={{ height: `${d.score * 4}px`, minHeight: d.score > 0 ? '8px' : '4px' }}
                />
              </div>
              <span className="text-[10px] font-bold text-blue-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 日报生成 */}
      {reportDetailTasks.length > 0 && (
        <div className="clay-card p-4 bg-gradient-to-br from-indigo-100 to-violet-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-indigo-700">📋 今日日报</p>
            <span className="text-[10px] text-indigo-500 font-medium">{todayStr}</span>
          </div>

          {workTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px]">💼</span>
                工作 · {workTasks.length} 项推进
              </p>
              {workTasks.map(task => (
                <div key={task.id} className="clay-card p-2.5 bg-white/70 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="clay-progress h-1.5 bg-gray-100 flex-1">
                        <div className="clay-progress-bar h-full bg-gradient-to-r from-blue-400 to-indigo-400" style={{ width: `${task.progress || 0}%` }} />
                      </div>
                      <span className="text-[10px] text-blue-600 font-bold">{task.progress || 0}%</span>
                    </div>
                  </div>
                  {task.status === 'done' && <span className="text-green-500 text-xs">✅</span>}
                </div>
              ))}
            </div>
          )}

          {personalTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-purple-600 flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-[10px]">🌱</span>
                个人 · {personalTasks.length} 项推进
              </p>
              {personalTasks.map(task => (
                <div key={task.id} className="clay-card p-2.5 bg-white/70 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="clay-progress h-1.5 bg-gray-100 flex-1">
                        <div className="clay-progress-bar h-full bg-gradient-to-r from-purple-400 to-pink-400" style={{ width: `${task.progress || 0}%` }} />
                      </div>
                      <span className="text-[10px] text-purple-600 font-bold">{task.progress || 0}%</span>
                    </div>
                  </div>
                  {task.status === 'done' && <span className="text-green-500 text-xs">✅</span>}
                </div>
              ))}
            </div>
          )}

          {[...familyTasks, ...otherTasks].length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-amber-600 flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-[10px]">🏷️</span>
                其他 · {[...familyTasks, ...otherTasks].length} 项推进
              </p>
              {[...familyTasks, ...otherTasks].map(task => (
                <div key={task.id} className="clay-card p-2.5 bg-white/70 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{task.title}</p>
                    <p className="text-[9px] text-amber-500 mt-0.5">{task.theme}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="clay-progress h-1.5 bg-gray-100 flex-1">
                        <div className="clay-progress-bar h-full bg-gradient-to-r from-amber-400 to-yellow-400" style={{ width: `${task.progress || 0}%` }} />
                      </div>
                      <span className="text-[10px] text-amber-600 font-bold">{task.progress || 0}%</span>
                    </div>
                  </div>
                  {task.status === 'done' && <span className="text-green-500 text-xs">✅</span>}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-indigo-200/50">
            <span className="text-[10px] text-indigo-500">
              今日共 {todayTasks.length} 项任务有进展
            </span>
            <span
              onClick={() => setShowReportDetail(true)}
              className="text-[10px] text-indigo-500 underline decoration-indigo-300 underline-offset-2 cursor-pointer hover:text-indigo-700"
            >
              查看详情 →
            </span>
          </div>
        </div>
      )}

      {/* 日报详情弹窗 */}
      {showReportDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 drawer-overlay" onClick={() => setShowReportDetail(false)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-gradient-to-b from-indigo-50 to-violet-50 rounded-[28px] p-5 space-y-3" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono bg-white/80 rounded-2xl p-4">
              {buildDailyReportText()}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReportDetail(false)} className="clay-btn px-4 py-2 bg-gray-100 text-xs font-bold text-gray-600">关闭</button>
              <button onClick={copyDailyReport} className="clay-btn px-4 py-2 bg-indigo-200 text-xs font-bold text-indigo-700">复制</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
