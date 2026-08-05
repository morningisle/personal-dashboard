import { useState, useEffect, useRef } from 'react'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useRecording } from '../hooks/useRecording'
import { useAI } from '../contexts/AIContext'
import ApiConfig from '../components/ApiConfig'
import ieltsVocab from '../data/ielts_vocab.js'
import listening179 from '../data/listening179.json'
import reading538 from '../data/reading538.js'

// ============ 数据 ============
const reviewSchedule = [
  { day: '今天', count: 20, status: 'current' },
  { day: '1天后', count: 18, status: 'pending' },
  { day: '3天后', count: 15, status: 'pending' },
  { day: '7天后', count: 12, status: 'pending' },
  { day: '15天后', count: 8, status: 'pending' },
]

const speakingScenarios = [
  { id: 'daily', label: '日常对话', icon: '💬', prompt: 'Please act as my English speaking partner. We will have a natural English conversation. Keep your turns short (2-3 sentences max). Interrupt me when my sentence is hard to understand. After every 3 rounds, give me brief feedback on grammar, word choice, and pronunciation priorities. I am a Chinese speaker at B1-B2 level.' },
  { id: 'work', label: '职场会议', icon: '💼', prompt: "Let's simulate a weekly sync meeting in English. You are my teammate. Ask me one question at a time about project progress, blockers, next steps, and risks. After each answer, tell me how to make it sound more natural and concise. Keep your responses short." },
  { id: 'interview', label: '面试模拟', icon: '🎯', prompt: 'Act as an interviewer for an international tech company. Ask me common behavioral and role-specific questions one by one. Challenge vague answers and ask follow-up questions. After each round, tell me how to make my answer clearer and more convincing.' },
  { id: 'custom', label: '自定义', icon: '✨', prompt: '' },
]

const writingTypes = [
  { id: 'email', label: '邮件', icon: '📧' },
  { id: 'report', label: '工作汇报', icon: '📊' },
  { id: 'essay', label: '考试作文', icon: '📝' },
  { id: 'free', label: '自由写作', icon: '✏️' },
]

// ============ 主组件 ============
export default function English() {
  const [activeTab, setActiveTab] = useState('vocab')
  const [showApiConfig, setShowApiConfig] = useState(false)

  const tts = useTextToSpeech()
  const recorder = useRecording()
  const ai = useAI() // 使用全局 AI 上下文

  const tabs = [
    { id: 'vocab', label: '词汇深度学', icon: '📖' },
    { id: 'listen', label: '听力三层练', icon: '🎧' },
    { id: 'reading', label: '阅读538', icon: '📚' },
    { id: 'speak', label: 'AI口语', icon: '💬' },
    { id: 'write', label: '写作批改', icon: '✍️' },
    { id: 'review', label: '复习中心', icon: '🔄' },
  ]

  // 首次使用且未配置时弹出设置
  useEffect(() => {
    if (!ai.isConfigured && (activeTab === 'vocab' || activeTab === 'listen' || activeTab === 'reading' || activeTab === 'speak' || activeTab === 'write')) {
      setShowApiConfig(true)
    }
  }, [activeTab])

  return (
    <div className="space-y-4 pb-4 ipad-content-width">
      {/* Header */}
      <div className="clay-card p-4 bg-gradient-to-br from-blue-100 to-indigo-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-blue-500 font-medium">今日进度</p>
            <p className="text-2xl font-bold text-blue-700">15<span className="text-sm text-blue-400">/20 词</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApiConfig(true)}
              className="w-8 h-8 rounded-full clay-btn bg-white/60 flex items-center justify-center text-sm"
              title="AI 设置"
            >
              ⚙️
            </button>
            <div className="w-14 h-14 rounded-full clay-card bg-gradient-to-br from-blue-200 to-indigo-200 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-700">75%</span>
            </div>
          </div>
        </div>
        <div className="clay-progress h-3 bg-blue-100">
          <div className="clay-progress-bar h-full bg-gradient-to-r from-blue-400 to-indigo-400" style={{ width: '75%' }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-2 px-1 rounded-2xl text-[10px] font-bold transition-all duration-300 ${
              activeTab === tab.id
                ? 'clay-tab-active bg-gradient-to-b from-blue-200 to-indigo-200 text-blue-700'
                : 'bg-white/50 text-gray-400'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'vocab' && <VocabTab ai={ai} tts={tts} />}
      {activeTab === 'listen' && <ListenTab ai={ai} tts={tts} recorder={recorder} />}
      {activeTab === 'reading' && <ReadingTab ai={ai} tts={tts} />}
      {activeTab === 'speak' && <SpeakTab ai={ai} tts={tts} recorder={recorder} />}
      {activeTab === 'write' && <WriteTab ai={ai} />}
      {activeTab === 'review' && <ReviewTab ai={ai} tts={tts} ieltsVocab={ieltsVocab} />}

      {/* API Config Modal */}
      <ApiConfig
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        config={ai.config}
        onSave={ai.updateConfig}
      />
    </div>
  )
}

// ============ Tab 1: 词汇深度学（22章雅思词库） ============
function VocabTab({ ai, tts }) {
  const [chapterIdx, setChapterIdx] = useState(0)
  const [groupIdx, setGroupIdx] = useState(0)
  const [wordIdx, setWordIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [aiPanel, setAiPanel] = useState(null)
  const [aiResult, setAiResult] = useState('')
  const [userInput, setUserInput] = useState('')
  const [mastered, setMastered] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ielts-vocab-mastered') || '{}') } catch { return {} }
  })

  const chapter = ieltsVocab[chapterIdx]
  const groups = chapter.words
  const group = groups[groupIdx] || []
  const word = group[wordIdx] || { word: [''], pos: '', meaning: '', example: '', extra: '' }

  const toggleMastered = (id) => {
    const key = `${chapterIdx}-${groupIdx}-${id}`
    const next = { ...mastered, [key]: !mastered[key] }
    setMastered(next)
    localStorage.setItem('ielts-vocab-mastered', JSON.stringify(next))
  }

  const wordText = Array.isArray(word.word) ? word.word[0] : word.word

  const handleAiAction = async (action) => {
    setAiPanel(action)
    setAiResult('')
    const prompts = {
      compare: `Explain the differences between "${wordText}" and 2-3 similar words in Chinese and English. Give common collocations and natural examples. Keep it concise (under 200 words). Use Chinese for explanations.`,
      collocation: `List the top 5 most common collocations for "${wordText}" with Chinese translations and example sentences. Format: collocation | 中文 | example sentence`,
      sentence: `Give me a real-life scenario where I would naturally use "${wordText}". Then ask me to create a sentence using it. Wait for my response.`,
      quiz: `Create 3 quick exercises about "${wordText}": 1 fill-in-the-blank, 1 translation (Chinese to English), 1 sentence creation. Keep answers hidden. Format clearly.`,
    }
    const result = await ai.chat([
      { role: 'system', content: 'You are an English vocabulary teacher for Chinese speakers. Be concise and practical.' },
      { role: 'user', content: prompts[action] }
    ])
    setAiResult(result || '加载失败')
  }

  const handleSentenceSubmit = async () => {
    if (!userInput.trim()) return
    const result = await ai.chat([
      { role: 'system', content: "You are an English vocabulary teacher. Evaluate the student's sentence." },
      { role: 'user', content: `The target word is "${wordText}". The student wrote: "${userInput}". Please: 1) Is the usage correct? 2) How natural does it sound (1-5)? 3) Suggest improvements. Use Chinese for feedback. Keep it under 100 words.` }
    ])
    setAiResult(prev => prev + '\n\n---\n📝 你的造句: ' + userInput + '\n\n' + result)
    setUserInput('')
  }

  const totalWords = groups.reduce((s, g) => s + g.length, 0)
  const masteredCount = Object.values(mastered).filter(Boolean).length
  const progress = totalWords > 0 ? Math.round(masteredCount / totalWords * 100) : 0

  return (
    <div className="space-y-3">
      {/* Chapter Selector */}
      <div className="clay-card p-4 bg-gradient-to-br from-indigo-100 to-purple-100">
        <p className="text-xs font-bold text-indigo-700 mb-2">选择章节</p>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {ieltsVocab.map((ch, i) => (
            <button
              key={i}
              onClick={() => { setChapterIdx(i); setGroupIdx(0); setWordIdx(0); setShowAnswer(false); setAiPanel(null) }}
              className={`text-[9px] px-2 py-1 rounded-full font-bold transition-all ${chapterIdx === i ? 'bg-indigo-200 text-indigo-700 clay-tab-active' : 'bg-white/60 text-indigo-500'}`}
            >
              {ch.chapter_name}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-indigo-500 mt-2">{chapter.chapter_name} · {groups.length} 组 · {totalWords} 词 · 已掌握 {masteredCount} 词 ({progress}%)</p>
      </div>

      {/* Group Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {groups.map((g, i) => (
          <button
            key={i}
            onClick={() => { setGroupIdx(i); setWordIdx(0); setShowAnswer(false); setAiPanel(null) }}
            className={`text-[9px] px-2 py-1 rounded-full font-bold whitespace-nowrap transition-all ${groupIdx === i ? 'bg-purple-200 text-purple-700 clay-tab-active' : 'bg-white/50 text-gray-500'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Word Card */}
      <div className="clay-card p-6 bg-gradient-to-br from-indigo-100 to-purple-100 text-center cursor-pointer" onClick={() => setShowAnswer(!showAnswer)}>
        {word.word.length > 1 && <p className="text-[10px] text-indigo-400 mb-2">同义词群：{word.word.join(' / ')}</p>}
        <p className="text-2xl font-bold text-indigo-700">{wordText}</p>
        <p className="text-xs text-indigo-500 mt-1">{word.pos}</p>
        {showAnswer ? (
          <div className="mt-4 space-y-2">
            <p className="text-base font-bold text-purple-700">{word.meaning}</p>
            {word.example && <p className="text-xs text-indigo-600 italic">"{word.example}"</p>}
            {word.extra && word.extra !== '-' && <p className="text-[10px] text-purple-500">{word.extra}</p>}
            <div className="flex items-center justify-center gap-2 mt-2">
              <button onClick={(e) => { e.stopPropagation(); tts.speak(wordText, { lang: 'en-US', rate: 0.8 }) }} className="px-3 py-1 text-[10px] font-bold clay-btn bg-green-200 text-green-700">
                🔊 发音
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleMastered(word.id) }} className={`px-3 py-1 text-[10px] font-bold clay-btn ${mastered[`${chapterIdx}-${groupIdx}-${word.id}`] ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                {mastered[`${chapterIdx}-${groupIdx}-${word.id}`] ? '✅ 已掌握' : '⬜ 标记掌握'}
              </button>
              {word.word.length > 1 && word.word[1] && (
                <button onClick={(e) => { e.stopPropagation(); tts.speak(word.word[1], { lang: 'en-US', rate: 0.8 }) }} className="px-3 py-1 text-[10px] font-bold clay-btn bg-green-200 text-green-700">
                  🔊 变体
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-indigo-400 mt-4">点击卡片查看释义 👆</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => { if (wordIdx > 0) setWordIdx(wordIdx - 1); else if (groupIdx > 0) { setGroupIdx(groupIdx - 1); setWordIdx(groups[groupIdx - 1].length - 1) } setShowAnswer(false); setAiPanel(null); setAiResult('') }} className="clay-btn w-10 h-10 bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-blue-700">←</button>
        <span className="text-xs font-bold text-gray-500">组 {groupIdx + 1}/{groups.length} · 词 {wordIdx + 1}/{group.length}</span>
        <button onClick={() => { if (wordIdx < group.length - 1) setWordIdx(wordIdx + 1); else if (groupIdx < groups.length - 1) { setGroupIdx(groupIdx + 1); setWordIdx(0) } setShowAnswer(false); setAiPanel(null); setAiResult('') }} className="clay-btn w-10 h-10 bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-blue-700">→</button>
      </div>

      {/* AI Actions */}
      {showAnswer && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handleAiAction('compare')} disabled={ai.isLoading} className="clay-btn py-2 bg-gradient-to-br from-amber-200 to-orange-200 text-xs font-bold text-amber-700 disabled:opacity-50">🔍 近义词对比</button>
          <button onClick={() => handleAiAction('collocation')} disabled={ai.isLoading} className="clay-btn py-2 bg-gradient-to-br from-green-200 to-emerald-200 text-xs font-bold text-green-700 disabled:opacity-50">📎 高频搭配</button>
          <button onClick={() => handleAiAction('sentence')} disabled={ai.isLoading} className="clay-btn py-2 bg-gradient-to-br from-blue-200 to-cyan-200 text-xs font-bold text-blue-700 disabled:opacity-50">✍️ 造句练习</button>
          <button onClick={() => handleAiAction('quiz')} disabled={ai.isLoading} className="clay-btn py-2 bg-gradient-to-br from-purple-200 to-pink-200 text-xs font-bold text-purple-700 disabled:opacity-50">📋 词汇抽查</button>
        </div>
      )}

      {aiPanel && (
        <div className="clay-card p-4 bg-gradient-to-br from-white/90 to-blue-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-600">{aiPanel === 'compare' && '🔍 近义词对比'}{aiPanel === 'collocation' && '📎 高频搭配'}{aiPanel === 'sentence' && '✍️ 造句练习'}{aiPanel === 'quiz' && '📋 词汇抽查'}</p>
            <button onClick={() => { setAiPanel(null); setAiResult(''); setUserInput('') }} className="text-xs text-gray-400">✕</button>
          </div>
          {ai.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-500"><span className="animate-pulse">AI 思考中...</span></div>
          ) : (
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiResult}</div>
          )}
          {aiPanel === 'sentence' && aiResult && !ai.isLoading && (
            <div className="flex gap-2">
              <input value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSentenceSubmit()} placeholder={`用 "${wordText}" 造句...`} className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <button onClick={handleSentenceSubmit} className="clay-btn px-3 py-2 bg-indigo-200 text-xs font-bold text-indigo-700">提交</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============ Tab 2: 听力三层练（179 雅思听力考点词） ============
function ListenTab({ ai, tts, recorder }) {
  const [wordIndex, setWordIndex] = useState(0)
  const [layer, setLayer] = useState(1)
  const [dictation, setDictation] = useState('')
  const [aiFeedback, setAiFeedback] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)

  const word = listening179[wordIndex]

  const handleCheckDictation = async () => {
    if (!dictation.trim()) return
    const result = await ai.chat([
      { role: 'system', content: 'You are a listening comprehension teacher.' },
      { role: 'user', content: `The target word is: "${word.word}" (meaning: ${word.meaning}). The student wrote: "${dictation}". Compare them. Show what the student got right and what they missed. Explain the key misses. Use Chinese. Be concise.` }
    ])
    setAiFeedback(result || '检查失败')
  }

  const handleExtract = async () => {
    const result = await ai.chat([
      { role: 'system', content: 'You are an English expression teacher.' },
      { role: 'user', content: `For the word "${word.word}" (meaning: ${word.meaning}), give 3 example sentences, 2 common collocations, and 1 synonym. Use Chinese for explanations.` }
    ])
    setAiFeedback(result || '提取失败')
  }

  const handleRetellCheck = async () => {
    if (!dictation.trim()) return
    const result = await ai.chat([
      { role: 'system', content: 'You are an English speaking evaluation teacher.' },
      { role: 'user', content: `The target word is "${word.word}" (meaning: ${word.meaning}). The student's retelling: "${dictation}". Evaluate: 1) Content accuracy 2) Key expressions used 3) Suggestions for improvement. Use Chinese.` }
    ])
    setAiFeedback(result || '评估失败')
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 font-medium">🎧 雅思听力 179 考点词 · {wordIndex + 1}/{listening179.length}</p>

      <div className="clay-card p-4 bg-gradient-to-br from-purple-100 to-pink-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-purple-700">{word.word}</p>
            <p className="text-xs text-purple-500">{word.type} · {word.meaning}</p>
            <p className="text-[10px] text-purple-400">
              同义替换：{word.replace.join(', ')}
            </p>
          </div>
          <button onClick={() => tts.speak(word.word, { lang: 'en-US', rate: 0.75 })} className="clay-btn w-10 h-10 bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white text-lg">▶</button>
        </div>

        <div className="flex gap-2">
          {[{ id: 1, label: '理解层', icon: '👂' }, { id: 2, label: '表达层', icon: '📎' }, { id: 3, label: '复述层', icon: '🗣' }].map(l => (
            <button key={l.id} onClick={() => { setLayer(l.id); setAiFeedback(''); setDictation(''); setShowAnswer(false) }} className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${layer === l.id ? 'bg-purple-200 text-purple-700 clay-tab-active' : 'bg-white/50 text-gray-400'}`}>{l.icon} {l.label}</button>
          ))}
        </div>
      </div>

      <div className="clay-card p-4 bg-gradient-to-br from-white/90 to-purple-50 space-y-3">
        {layer === 1 && (
          <>
            <p className="text-xs font-bold text-indigo-600">👂 听写：写下你听到的单词</p>
            <textarea value={dictation} onChange={(e) => setDictation(e.target.value)} placeholder="听发音，写下你听到的单词..." className="w-full h-20 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <div className="flex gap-2">
              <button onClick={() => tts.speak(word.word, { lang: 'en-US', rate: 0.65 })} className="clay-btn px-3 py-2 bg-purple-200 text-xs font-bold text-purple-700">🔊 慢速</button>
              <button onClick={() => tts.speak(word.word, { lang: 'en-US', rate: 0.85 })} className="clay-btn px-3 py-2 bg-purple-200 text-xs font-bold text-purple-700">🔊 常速</button>
              <button onClick={handleCheckDictation} disabled={ai.isLoading} className="clay-btn px-3 py-2 bg-indigo-200 text-xs font-bold text-indigo-700 disabled:opacity-50">{ai.isLoading ? '检查中...' : '✅ 对照'}</button>
            </div>
            <details className="text-xs"><summary className="cursor-pointer text-gray-500">查看答案</summary><p className="mt-2 text-indigo-700 font-bold">{word.word}</p><p className="text-gray-500">{word.meaning}</p><p className="text-gray-400">同义替换：{word.replace.join(', ')}</p></details>
          </>
        )}
        {layer === 2 && (
          <>
            <p className="text-xs font-bold text-indigo-600">📎 让 AI 帮你扩展表达</p>
            <button onClick={handleExtract} disabled={ai.isLoading} className="clay-btn px-3 py-2 bg-green-200 text-xs font-bold text-green-700 disabled:opacity-50">{ai.isLoading ? '提取中...' : '🔍 扩展学习'}</button>
            <textarea value={dictation} onChange={(e) => setDictation(e.target.value)} placeholder="用这个单词造个句子..." className="w-full h-20 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </>
        )}
        {layer === 3 && (
          <>
            <p className="text-xs font-bold text-indigo-600">🗣 不看原文，用你自己的话解释这个单词</p>
            <textarea value={dictation} onChange={(e) => setDictation(e.target.value)} placeholder="尝试用英文解释这个单词..." className="w-full h-20 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <button onClick={handleRetellCheck} disabled={ai.isLoading || !dictation.trim()} className="clay-btn px-3 py-2 bg-purple-200 text-xs font-bold text-purple-700 disabled:opacity-50">{ai.isLoading ? '评估中...' : '✅ 评估复述'}</button>
          </>
        )}
        {aiFeedback && <div className="clay-card p-3 bg-blue-50 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiFeedback}</div>}
      </div>

      <div className="flex gap-2">
        <button onClick={() => { setWordIndex(Math.max(0, wordIndex - 1)); setLayer(1); setAiFeedback(''); setDictation('') }} className="clay-btn w-10 h-10 bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-blue-700 text-lg">←</button>
        <div className="flex-1 grid grid-cols-4 gap-1.5 overflow-y-auto max-h-24">
          {listening179.map((w, i) => (
            <button key={i} onClick={() => { setWordIndex(i); setLayer(1); setAiFeedback(''); setDictation('') }} className={`text-[9px] py-1 rounded font-bold ${wordIndex === i ? 'bg-purple-200 text-purple-700' : 'bg-white/50 text-gray-400'}`}>{w.word}</button>
          ))}
        </div>
        <button onClick={() => { setWordIndex(Math.min(listening179.length - 1, wordIndex + 1)); setLayer(1); setAiFeedback(''); setDictation('') }} className="clay-btn w-10 h-10 bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-blue-700 text-lg">→</button>
      </div>
    </div>
  )
}

// ============ Tab 3: 阅读 538 同义替换 ============
function ReadingTab({ ai, tts }) {
  const [catIdx, setCatIdx] = useState(0)
  const [wordIdx, setWordIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  const category = reading538[catIdx]
  const word = category.words[wordIdx]

  return (
    <div className="space-y-3">
      <div className="clay-card p-4 bg-gradient-to-br from-emerald-100 to-teal-100">
        <p className="text-sm font-bold text-emerald-700">📚 阅读 538 考点词</p>
        <p className="text-[10px] text-emerald-500 mt-1">雅思阅读同义替换 · 3 级分类</p>
      </div>

      <div className="flex gap-2">
        {reading538.map((cat, i) => (
          <button
            key={i}
            onClick={() => { setCatIdx(i); setWordIdx(0); setShowAnswer(false) }}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${catIdx === i ? 'bg-emerald-200 text-emerald-700 clay-tab-active' : 'bg-white/50 text-gray-400'}`}
          >
            {cat.title}
          </button>
        ))}
      </div>

      <div className="clay-card p-5 bg-gradient-to-br from-emerald-100 to-teal-100 text-center">
        <p className="text-xs text-emerald-600 font-medium mb-1">{category.define} · 要求：{category.require}</p>
        {showAnswer ? (
          <div className="space-y-3 mt-2">
            <p className="text-2xl font-bold text-emerald-700">{word[0]}</p>
            <p className="text-xs text-emerald-500">{word[1]?.join(', ')}</p>
            <p className="text-base font-bold text-teal-700">{word[2]}</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {word[3]?.map((s, i) => <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-white/60 text-emerald-700 font-medium">{s}</span>)}
            </div>
            {word[4] && <p className="text-[10px] text-amber-600 italic">{word[4]}</p>}
            <button onClick={(e) => { e.stopPropagation(); tts.speak(word[0], { lang: 'en-US', rate: 0.8 }) }} className="clay-btn px-3 py-1 text-[10px] font-bold bg-green-200 text-green-700">🔊 发音</button>
          </div>
        ) : (
          <div className="py-6 cursor-pointer" onClick={() => setShowAnswer(true)}>
            <p className="text-2xl font-bold text-emerald-700">{word[0]}</p>
            <p className="text-xs text-emerald-400 mt-4">点击查看同义替换 👆</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => { setWordIdx(Math.max(0, wordIdx - 1)); setShowAnswer(false) }} className="clay-btn w-10 h-10 bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-blue-700">←</button>
        <span className="text-xs font-bold text-gray-500">{wordIdx + 1} / {category.words.length}</span>
        <button onClick={() => { setWordIdx(Math.min(category.words.length - 1, wordIdx + 1)); setShowAnswer(false) }} className="clay-btn w-10 h-10 bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-blue-700">→</button>
      </div>
    </div>
  )
}

// ============ Tab 4: AI 口语陪练 ============
function SpeakTab({ ai, tts, recorder }) {
  const [scenario, setScenario] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [sessionSummary, setSessionSummary] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startSession = (sc) => {
    setScenario(sc)
    setMessages([{
      role: 'assistant',
      content: sc.id === 'custom'
        ? 'Great! Tell me what scenario you\'d like to practice. I\'ll adapt to your needs.'
        : getScenarioGreeting(sc.id)
    }])
    setSessionSummary(null)
  }

  const sendMessage = async () => {
    if (!input.trim() || ai.isLoading) return

    const userMsg = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')

    // Build conversation with system prompt
    const systemMsg = {
      role: 'system',
      content: scenario?.prompt || speakingScenarios[0].prompt
    }

    // Add feedback instruction every 3 rounds
    const roundCount = newMessages.filter(m => m.role === 'user').length
    let feedbackNote = ''
    if (roundCount > 0 && roundCount % 3 === 0) {
      feedbackNote = '\n\n[This is round ' + roundCount + '. Please give brief feedback on the student\'s grammar, word choice, and naturalness before continuing the conversation.]'
    }

    const apiMessages = [systemMsg, ...newMessages.map(m => ({ role: m.role, content: m.content + feedbackNote }))]

    const result = await ai.chat(apiMessages, { temperature: 0.8, maxTokens: 500 })
    if (result) {
      setMessages(prev => [...prev, { role: 'assistant', content: result }])
      // TTS for AI response
      tts.speak(result, { lang: 'en-US', rate: 0.9 })
    }
  }

  const endSession = async () => {
    const result = await ai.chat([
      { role: 'system', content: 'You are an English learning coach. Summarize the session.' },
      { role: 'user', content: `Here is our conversation:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nPlease output:\n1. 📚 今天学到的表达 (3-5个)\n2. ❌ 关键错误 (2-3个)\n3. 📝 建议练习\n4. 🎯 下次重点\nUse Chinese. Be concise.` }
    ])
    setSessionSummary(result)
  }

  const resetSession = () => {
    setScenario(null)
    setMessages([])
    setInput('')
    setSessionSummary(null)
  }

  // Scenario selection
  if (!scenario) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500 font-medium">💬 选择练习场景</p>
        <div className="grid grid-cols-2 gap-3">
          {speakingScenarios.map(sc => (
            <button
              key={sc.id}
              onClick={() => sc.id === 'custom' ? startSession(sc) : startSession(sc)}
              className="clay-card p-4 bg-gradient-to-br from-blue-100 to-indigo-100 text-center hover:scale-105 transition-transform"
            >
              <span className="text-2xl">{sc.icon}</span>
              <p className="text-xs font-bold text-indigo-700 mt-2">{sc.label}</p>
            </button>
          ))}
        </div>

        {speakingScenarios.find(s => s.id === 'custom') && (
          <div className="clay-card p-4 bg-gradient-to-br from-amber-50 to-orange-50 space-y-2">
            <p className="text-xs font-bold text-amber-600">✨ 自定义场景提示词</p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="描述你想练习的场景...例如：假装我们在咖啡店偶遇，用英语聊天"
              className="w-full h-20 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        )}
      </div>
    )
  }

  // Session summary
  if (sessionSummary) {
    return (
      <div className="space-y-3">
        <div className="clay-card p-4 bg-gradient-to-br from-green-100 to-emerald-100">
          <p className="text-sm font-bold text-green-700 mb-2">📊 本次练习总结</p>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{sessionSummary}</div>
        </div>
        <button onClick={resetSession} className="w-full clay-btn py-3 bg-gradient-to-br from-blue-200 to-indigo-200 text-sm font-bold text-blue-700">
          开始新对话
        </button>
      </div>
    )
  }

  // Chat interface
  return (
    <div className="space-y-3">
      {/* Chat Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{scenario.icon}</span>
          <span className="text-xs font-bold text-indigo-600">{scenario.label}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={endSession} disabled={ai.isLoading || messages.length < 4} className="text-xs text-green-600 underline disabled:opacity-50">结束并总结</button>
          <button onClick={resetSession} className="text-xs text-gray-400 underline">退出</button>
        </div>
      </div>

      {/* Messages */}
      <div className="clay-card p-3 bg-gradient-to-br from-white/90 to-blue-50 h-[300px] overflow-y-auto space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-blue-200 text-blue-800 rounded-br-sm'
                : 'bg-white text-gray-700 rounded-bl-sm shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {ai.isLoading && (
          <div className="flex justify-start">
            <div className="bg-white px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm text-sm text-gray-400 animate-pulse">
              思考中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="输入英文回复..."
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={sendMessage}
          disabled={ai.isLoading || !input.trim()}
          className="clay-btn px-4 py-2 bg-gradient-to-br from-blue-300 to-indigo-300 text-sm font-bold text-white disabled:opacity-50"
        >
          发送
        </button>
      </div>

      {/* Voice Input */}
      <div className="flex gap-2">
        <button
          onClick={() => recorder.isRecording ? recorder.stopRecording() : recorder.startRecording()}
          className={`flex-1 clay-btn py-2 text-xs font-bold ${recorder.isRecording ? 'bg-red-200 text-red-700 animate-pulse' : 'bg-green-200 text-green-700'}`}
        >
          {recorder.isRecording ? '⏹ 停止录音' : '🎙 语音输入'}
        </button>
        {recorder.audioUrl && (
          <button onClick={recorder.playRecording} className="clay-btn px-3 py-2 bg-blue-200 text-xs font-bold text-blue-700">
            ▶ 回放
          </button>
        )}
      </div>
    </div>
  )
}

// ============ Tab 4: 写作批改 ============
function WriteTab({ ai }) {
  const [writingType, setWritingType] = useState('email')
  const [draft, setDraft] = useState('')
  const [step, setStep] = useState(1) // 1=写 2=批改 3=修改 4=对比
  const [feedback, setFeedback] = useState('')
  const [revisedDraft, setRevisedDraft] = useState('')
  const [finalVersion, setFinalVersion] = useState('')

  const handleAiReview = async () => {
    if (!draft.trim()) return
    setStep(2)

    const prompts = {
      email: 'Review this email draft. Do NOT rewrite it. Instead: 1) List the top 3-5 mistakes or awkward sentences with explanations of WHY they are weak. 2) Suggest what tone would be better. 3) Ask the student to revise. Use Chinese for explanations.',
      report: 'Review this work report/status update. Do NOT rewrite it. Instead: 1) Identify unclear or verbose parts. 2) Point out missing key info. 3) Suggest a more concise structure. Use Chinese for explanations.',
      essay: 'Grade this essay using IELTS Writing Task 2 criteria. Give band estimates for: Task Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Then list top 3 changes that would most improve the score. Use Chinese.',
      free: 'Review this free writing. Do NOT rewrite it. Instead: 1) What works well? 2) What could be improved? 3) List 3 specific suggestions with examples. Use Chinese for explanations.',
    }

    const result = await ai.chat([
      { role: 'system', content: 'You are an English writing coach. Help students improve their writing by pointing out issues, not rewriting for them.' },
      { role: 'user', content: `${prompts[writingType]}\n\nStudent's draft:\n${draft}` }
    ])
    setFeedback(result || '批改失败')
  }

  const handleShowFinal = async () => {
    const textToImprove = revisedDraft || draft
    const result = await ai.chat([
      { role: 'system', content: 'You are an English writing expert. Show a polished version of the text.' },
      { role: 'user', content: `Here is the ${writingType === 'email' ? 'email' : writingType === 'report' ? 'report' : writingType === 'essay' ? 'essay' : 'text'} after the student's revision:\n\n${textToImprove}\n\nPlease show a stronger, more natural version for comparison. Then list 5 reusable expressions from your version. Use Chinese for explanations.` }
    ])
    setFinalVersion(result || '生成失败')
    setStep(4)
  }

  return (
    <div className="space-y-3">
      {/* Writing Type */}
      <div className="flex gap-2">
        {writingTypes.map(t => (
          <button
            key={t.id}
            onClick={() => { setWritingType(t.id); setStep(1); setFeedback(''); setFinalVersion(''); setRevisedDraft('') }}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${writingType === t.id ? 'bg-gradient-to-b from-green-200 to-emerald-200 text-green-700 clay-tab-active' : 'bg-white/50 text-gray-400'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1 text-[10px] text-gray-500">
        {['1. 自己写', '2. AI批改', '3. 自己改', '4. 看升级版'].map((s, i) => (
          <span key={i} className={`flex-1 text-center py-1 rounded-lg ${step >= i + 1 ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50'}`}>
            {s}
          </span>
        ))}
      </div>

      {/* Step 1: Write */}
      {step === 1 && (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              writingType === 'email' ? 'Write your email here...' :
              writingType === 'report' ? 'Write your status update or report...' :
              writingType === 'essay' ? 'Write your essay here...' :
              'Write anything in English...'
            }
            className="w-full h-40 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          <button
            onClick={handleAiReview}
            disabled={ai.isLoading || !draft.trim()}
            className="w-full clay-btn py-3 bg-gradient-to-br from-green-300 to-emerald-300 text-sm font-bold text-white disabled:opacity-50"
          >
            {ai.isLoading ? 'AI 批改中...' : '📝 提交 AI 批改'}
          </button>
        </div>
      )}

      {/* Step 2: AI Feedback */}
      {step === 2 && feedback && (
        <div className="space-y-3">
          <div className="clay-card p-4 bg-gradient-to-br from-amber-50 to-orange-50">
            <p className="text-xs font-bold text-amber-600 mb-2">📝 AI 批改反馈</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{feedback}</div>
          </div>
          <button
            onClick={() => { setStep(3); setRevisedDraft(draft) }}
            className="w-full clay-btn py-3 bg-gradient-to-br from-blue-200 to-indigo-200 text-sm font-bold text-blue-700"
          >
            开始自己修改 ✍️
          </button>
        </div>
      )}

      {/* Step 3: Self Revise */}
      {step === 3 && (
        <div className="space-y-3">
          <textarea
            value={revisedDraft}
            onChange={(e) => setRevisedDraft(e.target.value)}
            placeholder="根据 AI 反馈，修改你的文章..."
            className="w-full h-40 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={handleShowFinal}
            disabled={ai.isLoading}
            className="w-full clay-btn py-3 bg-gradient-to-br from-purple-300 to-pink-300 text-sm font-bold text-white disabled:opacity-50"
          >
            {ai.isLoading ? '生成中...' : '👀 查看升级版'}
          </button>
        </div>
      )}

      {/* Step 4: Final Comparison */}
      {step === 4 && finalVersion && (
        <div className="space-y-3">
          <div className="clay-card p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
            <p className="text-xs font-bold text-blue-600 mb-2">📄 你的修改版</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{revisedDraft}</div>
          </div>
          <div className="clay-card p-4 bg-gradient-to-br from-green-50 to-emerald-50">
            <p className="text-xs font-bold text-green-600 mb-2">✨ AI 升级版</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{finalVersion}</div>
          </div>
          <button
            onClick={() => { setStep(1); setDraft(''); setFeedback(''); setFinalVersion(''); setRevisedDraft('') }}
            className="w-full clay-btn py-3 bg-gradient-to-br from-gray-200 to-gray-300 text-sm font-bold text-gray-700"
          >
            开始新写作 📝
          </button>
        </div>
      )}
    </div>
  )
}

// ============ Tab 5: 复习中心 ============
function ReviewTab({ ai, tts, ieltsVocab }) {
  const [reviewMode, setReviewMode] = useState('schedule')
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)
  const [aiQuiz, setAiQuiz] = useState('')

  const [errors, setErrors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('english-errors') || '[]') } catch { return [] }
  })

  // Build flashcard list from all vocab words
  const allWords = ieltsVocab ? ieltsVocab.flatMap(ch => ch.words.flatMap(g => g.map(w => ({
    front: Array.isArray(w.word) ? w.word[0] : w.word,
    back: `${w.meaning}\n\n${w.example || ''}`,
  })))) : []

  const flashcards = allWords.slice(0, 100)

  const generateAiQuiz = async () => {
    const words = allWords.slice(0, 20).map(w => w.front).join(', ')
    const errorWords = errors.slice(0, 5).map(e => e.word).join(', ')
    const result = await ai.chat([
      { role: 'system', content: 'You are an English quiz generator.' },
      { role: 'user', content: `Create a mixed quiz with 5 questions about these words: ${words}. ${errorWords ? `Also focus on these frequently missed words: ${errorWords}.` : ''} Mix formats: translation, fill-in-the-blank, sentence creation. Use Chinese for instructions. Don't show answers.` }
    ])
    setAiQuiz(result || '生成失败')
  }

  const markError = (word, context) => {
    const newError = { word, context, date: new Date().toISOString().split('T')[0] }
    const updated = [newError, ...errors].slice(0, 50)
    setErrors(updated)
    localStorage.setItem('english-errors', JSON.stringify(updated))
  }

  return (
    <div className="space-y-3">
      {/* Mode Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'schedule', label: '复习计划', icon: '📅' },
          { id: 'flashcard', label: '闪卡', icon: '🃏' },
          { id: 'errors', label: '错题本', icon: '❌' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setReviewMode(m.id)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${reviewMode === m.id ? 'bg-gradient-to-b from-amber-200 to-orange-200 text-amber-700 clay-tab-active' : 'bg-white/50 text-gray-400'}`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Schedule Mode */}
      {reviewMode === 'schedule' && (
        <div className="space-y-3">
          <div className="clay-card p-4 bg-gradient-to-br from-amber-100 to-orange-100">
            <p className="text-sm font-bold text-amber-700 mb-1">🧠 艾宾浩斯记忆曲线</p>
            <p className="text-xs text-amber-600">科学安排复习，记忆更牢固</p>
          </div>

          {reviewSchedule.map((item, i) => (
            <div
              key={i}
              className={`clay-card p-4 flex items-center justify-between ${item.status === 'current' ? 'bg-gradient-to-r from-green-100 to-emerald-100' : 'bg-gradient-to-r from-gray-50 to-white/60'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold ${item.status === 'current' ? 'bg-gradient-to-br from-green-300 to-emerald-300 text-green-700 clay-tab-active' : 'bg-gray-100 text-gray-400'}`}>
                  {item.status === 'current' ? '📗' : '📄'}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">{item.day}</p>
                  <p className="text-xs text-gray-400">{item.count} 个单词待复习</p>
                </div>
              </div>
              <button className={`clay-btn px-4 py-2 text-xs font-bold ${item.status === 'current' ? 'bg-gradient-to-br from-green-300 to-emerald-300 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {item.status === 'current' ? '开始复习' : '未到时间'}
              </button>
            </div>
          ))}

          {/* AI Generated Quiz */}
          <button
            onClick={generateAiQuiz}
            disabled={ai.isLoading}
            className="w-full clay-btn py-3 bg-gradient-to-br from-purple-200 to-pink-200 text-sm font-bold text-purple-700 disabled:opacity-50"
          >
            {ai.isLoading ? '生成中...' : '🤖 AI 生成针对性测验'}
          </button>
          {aiQuiz && (
            <div className="clay-card p-4 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiQuiz}</div>
            </div>
          )}
        </div>
      )}

      {/* Flashcard Mode */}
      {reviewMode === 'flashcard' && (
        <div className="space-y-3">
          <div
            className="clay-card p-6 bg-gradient-to-br from-indigo-100 to-purple-100 text-center cursor-pointer min-h-[160px] flex flex-col items-center justify-center"
            onClick={() => setFlashcardFlipped(!flashcardFlipped)}
          >
            {!flashcardFlipped ? (
              <>
                <p className="text-2xl font-bold text-indigo-700">{flashcards[flashcardIndex].front}</p>
                <p className="text-sm text-indigo-500 mt-1">{flashcards[flashcardIndex].phonetic}</p>
                <p className="text-xs text-indigo-400 mt-4">点击翻转 👆</p>
              </>
            ) : (
              <div className="text-left w-full">
                <p className="text-base font-bold text-purple-700 whitespace-pre-wrap">{flashcards[flashcardIndex].back}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => { setFlashcardIndex(Math.max(0, flashcardIndex - 1)); setFlashcardFlipped(false) }} className="clay-btn w-10 h-10 bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-blue-700">←</button>
            <div className="flex gap-2">
              <button
                onClick={() => markError(flashcards[flashcardIndex].front, 'flashcard')}
                className="clay-btn px-3 py-2 bg-red-200 text-xs font-bold text-red-700"
              >
                ❌ 不熟
              </button>
              <button
                onClick={() => tts.speak(flashcards[flashcardIndex].front, { lang: 'en-US', rate: 0.8 })}
                className="clay-btn px-3 py-2 bg-green-200 text-xs font-bold text-green-700"
              >
                🔊
              </button>
            </div>
            <button onClick={() => { setFlashcardIndex(Math.min(flashcards.length - 1, flashcardIndex + 1)); setFlashcardFlipped(false) }} className="clay-btn w-10 h-10 bg-gradient-to-br from-blue-200 to-blue-300 flex items-center justify-center text-blue-700">→</button>
          </div>
          <p className="text-center text-xs text-gray-400">{flashcardIndex + 1} / {flashcards.length}</p>
        </div>
      )}

      {/* Error Book Mode */}
      {reviewMode === 'errors' && (
        <div className="space-y-3">
          {errors.length === 0 ? (
            <div className="clay-card p-6 text-center bg-gradient-to-br from-gray-50 to-white">
              <p className="text-2xl mb-2">📝</p>
              <p className="text-sm text-gray-500">还没有错题记录</p>
              <p className="text-xs text-gray-400 mt-1">在闪卡或练习中标记"不熟"的词会出现在这里</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold text-red-600">❌ 共 {errors.length} 个错词</p>
              {errors.slice(0, 20).map((err, i) => (
                <div key={i} className="clay-card p-3 bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-700">{err.word}</p>
                    <p className="text-xs text-gray-400">{err.context} · {err.date}</p>
                  </div>
                  <button
                    onClick={() => tts.speak(err.word, { lang: 'en-US', rate: 0.8 })}
                    className="clay-btn w-8 h-8 bg-green-200 flex items-center justify-center text-green-700 text-xs"
                  >
                    🔊
                  </button>
                </div>
              ))}
              <button
                onClick={() => { setErrors([]); localStorage.removeItem('english-errors') }}
                className="w-full text-xs text-gray-400 underline py-2"
              >
                清空错题本
              </button>
            </>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="clay-card p-4 bg-gradient-to-br from-purple-100 to-pink-100 text-center">
        <p className="text-3xl mb-2">🎯</p>
        <p className="text-sm font-bold text-purple-700">累计掌握 2,340 词</p>
        <p className="text-xs text-purple-500">坚持就是胜利！继续保持～</p>
      </div>
    </div>
  )
}

// ============ 辅助函数 ============
function getScenarioGreeting(scenarioId) {
  const greetings = {
    daily: "Hey there! How's your day going? Tell me something interesting that happened recently.",
    work: "Hi! Let's get started with our weekly sync. What project are you working on this week? Any blockers I should know about?",
    interview: "Welcome! Thanks for coming in today. Let's start with a simple question: Can you tell me a little about yourself and why you're interested in this position?",
  }
  return greetings[scenarioId] || "Let's practice English together!"
}
