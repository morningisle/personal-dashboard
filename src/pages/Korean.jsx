import { useState, useMemo } from 'react'
import { useTextToSpeech } from '../hooks/useTextToSpeech'
import { useRecording } from '../hooks/useRecording'
import { useMistakeBook } from '../hooks/useMistakeBook'
import { yonseiWords, yonseiChapters, getWord, getByTopik, getByChapter } from '../data/yonseiVocab'
import KoreanWritingTest from '../components/KoreanWritingTest'

// TOPIK 难度标签颜色
const topikColors = {
  1: 'bg-green-200 text-green-700',
  2: 'bg-emerald-200 text-emerald-700',
  3: 'bg-blue-200 text-blue-700',
  4: 'bg-indigo-200 text-indigo-700',
  5: 'bg-purple-200 text-purple-700',
  6: 'bg-red-200 text-red-700',
}

// 词源类型颜色
const originColors = {
  '汉字词': 'bg-rose-100 text-rose-600',
  '固有词': 'bg-teal-100 text-teal-600',
  '外来词': 'bg-sky-100 text-sky-600',
  '表达': 'bg-amber-100 text-amber-600',
  '混合词': 'bg-violet-100 text-violet-600',
}

const koreanAlphabet = {
  vowels: [
    { letter: 'ㅏ', roman: 'a', sound: '啊', tip: '嘴巴张大，发"啊"', example: '아이 (孩子)', topik: 1 },
    { letter: 'ㅑ', roman: 'ya', sound: '呀', tip: '比"啊"短促，加"y"音', example: '야구 (棒球)', topik: 1 },
    { letter: 'ㅓ', roman: 'eo', sound: '哦', tip: '嘴微张，舌头放平', example: '어머니 (母亲)', topik: 1 },
    { letter: 'ㅕ', roman: 'yeo', sound: '哟', tip: '加"y"的"哦"音', example: '여자 (女人)', topik: 1 },
    { letter: 'ㅗ', roman: 'o', sound: '喔', tip: '嘴唇圆，发"喔"', example: '오이 (黄瓜)', topik: 1 },
    { letter: 'ㅛ', roman: 'yo', sound: '哟', tip: '加"y"的"喔"音', example: '요리 (料理)', topik: 1 },
    { letter: 'ㅜ', roman: 'u', sound: '乌', tip: '嘴唇突出，发"乌"', example: '우유 (牛奶)', topik: 1 },
    { letter: 'ㅠ', roman: 'yu', sound: '尤', tip: '加"y"的"乌"音', example: '유리 (玻璃)', topik: 1 },
    { letter: 'ㅡ', roman: 'eu', sound: '额', tip: '嘴微开，舌头后缩', example: '으아 (哎呀)', topik: 1 },
    { letter: 'ㅣ', roman: 'i', sound: '衣', tip: '嘴唇扁平，发"衣"', example: '이 (牙齿)', topik: 1 },
  ],
  consonants: [
    { letter: 'ㄱ', roman: 'g/k', sound: '哥', tip: '舌根抵软腭', example: '고기 (肉)', topik: 1 },
    { letter: 'ㄴ', roman: 'n', sound: '那', tip: '舌尖抵上齿龈', example: '나무 (树)', topik: 1 },
    { letter: 'ㄷ', roman: 'd/t', sound: '大', tip: '舌尖抵上齿龈', example: '다리 (腿)', topik: 1 },
    { letter: 'ㄹ', roman: 'r/l', sound: '拉', tip: '舌尖弹上齿龈', example: '라면 (拉面)', topik: 1 },
    { letter: 'ㅁ', roman: 'm', sound: '妈', tip: '双唇闭合', example: '머니 (钱)', topik: 1 },
    { letter: 'ㅂ', roman: 'b/p', sound: '巴', tip: '双唇闭合', example: '바다 (大海)', topik: 1 },
    { letter: 'ㅅ', roman: 's', sound: '撒', tip: '舌尖近上齿', example: '사람 (人)', topik: 1 },
    { letter: 'ㅇ', roman: 'ng', sound: '嗯', tip: '鼻音，舌根后缩', example: '아이 (孩子)', topik: 1 },
    { letter: 'ㅈ', roman: 'j', sound: '加', tip: '舌尖近上齿龈', example: '자기 (自己)', topik: 1 },
    { letter: 'ㅊ', roman: 'ch', sound: '差', tip: '送气的ㅈ', example: '차 (茶)', topik: 1 },
  ],
}

// 从延世词库选取今日词汇（第1册第1课，前30个）
const todayYonseiWords = yonseiWords.filter(w => w[3] === 1 && w[4] === 1).slice(0, 30)
const dailyWords = todayYonseiWords.map(w => ({
  word: w[1], meaning: w[2], category: w[7] || '词汇', roman: '', topik: w[6],
  origin: w[7], originDetail: w[8], pos: w[9], volume: w[3], chapter: w[4], unit: w[5], id: w[0],
}))

// 今日句型 5 句（含 TOPIK 等级）
const dailySentences = [
  { ko: '이것은 무엇이에요?', zh: '这是什么？', roman: 'igeoseun mueosieyo?', grammar: '-은/는 (主题标记)', topik: 1 },
  { ko: '저는 학생이에요.', zh: '我是学生。', roman: 'jeoneun haksaengieyo.', grammar: '-이에요 (是...)', topik: 1 },
  { ko: '한국어를 배우고 싶어요.', zh: '我想学韩语。', roman: 'hangugeoreul baeugo sipeoyo.', grammar: '-고 싶다 (想要...)', topik: 2 },
  { ko: '오늘 날씨가 어때요?', zh: '今天天气怎么样？', roman: 'oneul nalssiga eottaeyo?', grammar: '-어때요? (怎么样?)', topik: 2 },
  { ko: '같이 밥 먹을래요?', zh: '要一起吃饭吗？', roman: 'gachi bap meogeullaeyo?', grammar: '-ㄹ래요? (要...吗?)', topik: 2 },
]

// 今日语法 5 个
const dailyGrammar = [
  { pattern: '-이에요 / -예요', meaning: '表示"是..."，相当于英语的 "to be"', example: '저는 학생이에요. (我是学生。)', note: '名词有收音用 -이에요，无收音用 -예요', topik: 1 },
  { pattern: '-은/는', meaning: '主题助词，标记句子的主题', example: '이것은 책이에요. (这是书。)', note: '有收音用 -은，无收音用 -는', topik: 1 },
  { pattern: '-고 싶다', meaning: '表示"想要做某事"', example: '영화를 보고 싶어요. (我想看电影。)', note: '接在动词词干后面', topik: 2 },
  { pattern: '-아/어요', meaning: '非正式敬语终结词尾，最常用的礼貌表达', example: '좋아요! (好的！)', note: '根据词干元音选择 -아요 或 -어요', topik: 1 },
  { pattern: '-래요?', meaning: '表示提议或询问对方意愿，"要...吗？"', example: '같이 갈래요? (要一起去吗？)', note: '接在动词词干后面，用于邀请', topik: 2 },
]

// 从延世词库动态生成小测验
function generateQuiz() {
  const pool = yonseiWords.filter(w => w[6] <= 2)
  const quiz = []
  const used = new Set()
  while (quiz.length < 10 && quiz.length < pool.length) {
    const idx = Math.floor(Math.random() * pool.length)
    if (used.has(idx)) continue
    used.add(idx)
    const w = pool[idx]
    const distractors = []
    while (distractors.length < 3) {
      const d = pool[Math.floor(Math.random() * pool.length)]
      if (d[1] !== w[1] && !distractors.includes(d[2])) distractors.push(d[2])
    }
    const options = [w[2], ...distractors].sort(() => Math.random() - 0.5)
    quiz.push({ type: 'word', question: `"${w[1]}" 的中文意思是？`, options, answer: options.indexOf(w[2]), topik: w[6] })
  }
  return quiz
}

export default function Korean() {
  const [activeTab, setActiveTab] = useState('alphabet')
  const [showTip, setShowTip] = useState(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState(null)
  const [quizCorrect, setQuizCorrect] = useState(null)
  const [quizScore, setQuizScore] = useState(0)
  const [quizDone, setQuizDone] = useState(false)
  const [showRecordOverlay, setShowRecordOverlay] = useState(false)
  const [recordTarget, setRecordTarget] = useState(null)
  const [vocabSubTab, setVocabSubTab] = useState('words')
  const [browseVol, setBrowseVol] = useState(1)
  const [browseCh, setBrowseCh] = useState(1)
  const [quizQuestions, setQuizQuestions] = useState(() => generateQuiz())

  const tts = useTextToSpeech()
  const recorder = useRecording()
  const mistakeBook = useMistakeBook()

  const tabs = [
    { id: 'alphabet', label: '四十音', icon: '🔤' },
    { id: 'vocab', label: '每日学习', icon: '📝' },
    { id: 'mistake', label: '错题本', icon: '📒' },
    { id: 'quiz', label: '小测验', icon: '✏️' },
  ]

  const vocabSubTabs = [
    { id: 'words', label: '词汇', icon: '📖' },
    { id: 'browse', label: '词库', icon: '📚' },
    { id: 'writing', label: '默写', icon: '✍️' },
    { id: 'sentences', label: '句型', icon: '💬' },
    { id: 'grammar', label: '语法', icon: '📐' },
  ]

  // 词库浏览数据
  const browseWords = useMemo(() => getByChapter(browseVol, browseCh), [browseVol, browseCh])
  const chapterCount = useMemo(() => Object.keys(yonseiChapters).filter(k => k.startsWith(`v${browseVol}-`)).length, [browseVol])

  const speakKorean = (text, rate = 0.75) => {
    tts.speak(text, { lang: 'ko-KR', rate })
  }

  const handleQuizSelect = (optionIndex) => {
    if (quizCorrect !== null) return
    setQuizAnswer(optionIndex)
    const correct = optionIndex === quizQuestions[quizIndex].answer
    setQuizCorrect(correct)
    if (correct) setQuizScore(prev => prev + 1)
  }

  const nextQuiz = () => {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex(quizIndex + 1)
      setQuizAnswer(null)
      setQuizCorrect(null)
    } else {
      setQuizDone(true)
    }
  }

  const resetQuiz = () => {
    setQuizIndex(0)
    setQuizAnswer(null)
    setQuizCorrect(null)
    setQuizScore(0)
    setQuizDone(false)
    setQuizQuestions(generateQuiz())
  }

  return (
    <div className="space-y-4 pb-4 ipad-content-width">
      {/* Header */}
      <div className="clay-card p-4 bg-gradient-to-br from-orange-100 to-amber-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-orange-500 font-medium">延世词库</p>
            <p className="text-2xl font-bold text-orange-700">{yonseiWords.length}<span className="text-sm text-orange-400"> 词</span></p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[10px] text-orange-500">错题本</p>
              <p className="text-lg font-bold text-orange-700">{mistakeBook.count}<span className="text-xs text-orange-400"> 条</span></p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-200 flex items-center justify-center text-lg">📒</div>
          </div>
        </div>
        <div className="clay-progress h-3 bg-orange-100">
          <div className="clay-progress-bar h-full bg-gradient-to-r from-orange-400 to-amber-400" style={{ width: '35%' }} />
        </div>
        <p className="text-[10px] text-orange-500 mt-1">延世韩国语 1-6 册 · 共 {yonseiWords.length} 词</p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-0.5 py-2 rounded-xl text-[10px] font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              activeTab === tab.id
                ? 'clay-tab-active bg-gradient-to-b from-orange-200 to-amber-200 text-orange-700'
                : 'bg-white/50 text-gray-400'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 四十音 ===== */}
      {activeTab === 'alphabet' && (
        <div className="space-y-3">
          <div className="clay-card p-3 bg-gradient-to-br from-amber-100 to-yellow-100">
            <p className="text-xs text-amber-700 font-medium">💡 点击字母查看发音要点，用例词练习发音</p>
          </div>

          <p className="text-xs font-bold text-gray-600">📌 基础元音 (10个)</p>
          <div className="grid grid-cols-5 ipad-grid-3 gap-2">
            {koreanAlphabet.vowels.map((v, i) => (
              <button
                key={i}
                onClick={() => setShowTip(showTip === `v${i}` ? null : `v${i}`)}
                className={`clay-card p-2 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  showTip === `v${i}`
                    ? 'bg-gradient-to-br from-pink-200 to-purple-200 scale-105 clay-tab-active'
                    : 'bg-gradient-to-br from-amber-50 to-orange-50 hover:scale-105'
                }`}
              >
                <p className="text-xl font-bold text-orange-700">{v.letter}</p>
                <p className="text-[9px] text-orange-500">{v.roman}</p>
                <p className="text-[9px] text-orange-400 mt-0.5">{v.sound}</p>
              </button>
            ))}
          </div>
          {showTip?.startsWith('v') && (() => {
            const v = koreanAlphabet.vowels[parseInt(showTip.slice(1))]
            return (
              <div className="clay-card p-3 bg-gradient-to-br from-pink-100 to-purple-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-pink-700">{v.letter} <span className="text-xs font-normal text-pink-500">({v.roman})</span></p>
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${topikColors[v.topik]}`}>TOPIK {v.topik}</span>
                    <button onClick={() => speakKorean(v.example.split(' ')[0], 0.6)} className="clay-btn px-2 py-1 bg-pink-200 text-[10px] font-bold text-pink-700">
                      {tts.isSpeaking ? '🔊...' : '🔊'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-pink-600">{v.tip}</p>
                <p className="text-xs text-purple-600 mt-1">例词：{v.example}</p>
              </div>
            )
          })()}

          <p className="text-xs font-bold text-gray-600 mt-2">📌 基础辅音 (10个)</p>
          <div className="grid grid-cols-5 ipad-grid-3 gap-2">
            {koreanAlphabet.consonants.map((c, i) => (
              <button
                key={i}
                onClick={() => setShowTip(showTip === `c${i}` ? null : `c${i}`)}
                className={`clay-card p-2 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  showTip === `c${i}`
                    ? 'bg-gradient-to-br from-green-200 to-emerald-200 scale-105 clay-tab-active'
                    : 'bg-gradient-to-br from-green-50 to-emerald-50 hover:scale-105'
                }`}
              >
                <p className="text-xl font-bold text-green-700">{c.letter}</p>
                <p className="text-[9px] text-green-500">{c.roman}</p>
                <p className="text-[9px] text-green-400 mt-0.5">{c.sound}</p>
              </button>
            ))}
          </div>
          {showTip?.startsWith('c') && (() => {
            const c = koreanAlphabet.consonants[parseInt(showTip.slice(1))]
            return (
              <div className="clay-card p-3 bg-gradient-to-br from-green-100 to-emerald-100">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-green-700">{c.letter} <span className="text-xs font-normal text-green-500">({c.roman})</span></p>
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${topikColors[c.topik]}`}>TOPIK {c.topik}</span>
                    <button onClick={() => speakKorean(c.example.split(' ')[0], 0.6)} className="clay-btn px-2 py-1 bg-green-200 text-[10px] font-bold text-green-700">
                      {tts.isSpeaking ? '🔊...' : '🔊'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-green-600">{c.tip}</p>
                <p className="text-xs text-emerald-600 mt-1">例词：{c.example}</p>
              </div>
            )
          })()}
        </div>
      )}

      {/* ===== 每日学习 ===== */}
      {activeTab === 'vocab' && (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {vocabSubTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVocabSubTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                  vocabSubTab === tab.id
                    ? 'clay-tab-active bg-gradient-to-b from-orange-200 to-amber-200 text-orange-700'
                    : 'bg-white/50 text-gray-400'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 词汇 30 */}
          {vocabSubTab === 'words' && (
            <div className="space-y-2">
              <div className="clay-card p-3 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-orange-700">📖 今日新词（延世第1册第1课）</p>
                  <p className="text-[10px] text-orange-500">共 {dailyWords.length} 词 · 点击 📚 词库浏览更多</p>
                </div>
                <button onClick={() => speakKorean(dailyWords.map(w => w.word).join(', '), 0.7)} className="clay-btn px-3 py-1 bg-orange-200 text-[10px] font-bold text-orange-700">
                  🔊 全部朗读
                </button>
              </div>
              {dailyWords.map((v, i) => (
                <div key={i} className="clay-card p-3 bg-gradient-to-br from-orange-50 to-amber-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-200 text-orange-600 font-bold">{i + 1}</span>
                        <p className="text-sm font-bold text-orange-700">{v.word}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${topikColors[v.topik]}`}>TOPIK {v.topik}</span>
                        {v.origin && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${originColors[v.origin] || 'bg-gray-100 text-gray-500'}`}>{v.origin}</span>}
                      </div>
                      <p className="text-xs text-orange-500 mt-0.5">{v.meaning}{v.pos ? ` · ${v.pos}` : ''}</p>
                      {v.originDetail && <p className="text-[10px] text-gray-400 mt-0.5">词源：{v.originDetail}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => speakKorean(v.word)} className="w-7 h-7 clay-btn bg-orange-200 flex items-center justify-center text-xs">🔊</button>
                      <button onClick={() => { setRecordTarget(`daily-${i}`); setShowRecordOverlay(true) }} className="w-7 h-7 clay-btn bg-blue-200 flex items-center justify-center text-xs">🎙</button>
                      <button
                        onClick={() => mistakeBook.addItem({ id: `word-${v.id || i}`, type: 'word', content: v.word, meaning: v.meaning, topik: v.topik, origin: v.origin })}
                        className={`w-7 h-7 clay-btn flex items-center justify-center text-xs ${mistakeBook.isSaved(`word-${v.id || i}`) ? 'bg-red-200 text-red-600' : 'bg-gray-100 text-gray-400'}`}
                        title="加入错题本"
                      >
                        {mistakeBook.isSaved(`word-${v.id || i}`) ? '❤️' : '🤍'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 词库浏览 */}
          {vocabSubTab === 'browse' && (
            <div className="space-y-3">
              <div className="clay-card p-3 bg-gradient-to-br from-indigo-100 to-blue-100">
                <p className="text-xs font-bold text-indigo-700">📚 延世韩国语词库</p>
                <p className="text-[10px] text-indigo-500">共 {yonseiWords.length} 词 · 6 册 {Object.keys(yonseiChapters).length} 课</p>
              </div>
              {/* 册选择 */}
              <div className="flex gap-1.5">
                {[1,2,3,4,5,6].map(v => (
                  <button key={v} onClick={() => { setBrowseVol(v); setBrowseCh(1) }}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${browseVol === v ? 'clay-tab-active bg-gradient-to-b from-indigo-200 to-blue-200 text-indigo-700' : 'bg-white/50 text-gray-400'}`}>
                    {v}册
                  </button>
                ))}
              </div>
              {/* 课选择 */}
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: chapterCount }, (_, i) => i + 1).map(c => (
                  <button key={c} onClick={() => setBrowseCh(c)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${browseCh === c ? 'clay-tab-active bg-gradient-to-b from-indigo-200 to-blue-200 text-indigo-700' : 'bg-white/50 text-gray-400'}`}>
                    {c}课
                  </button>
                ))}
              </div>
              {/* 当前课信息 */}
              {yonseiChapters[`v${browseVol}-c${browseCh}`] && (
                <div className="clay-card p-3 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <p className="text-sm font-bold text-indigo-700">{yonseiChapters[`v${browseVol}-c${browseCh}`].ko}</p>
                  <p className="text-xs text-indigo-500">{yonseiChapters[`v${browseVol}-c${browseCh}`].zh}</p>
                  <p className="text-[10px] text-gray-400 mt-1">共 {browseWords.length} 个词汇</p>
                </div>
              )}
              {/* 单词列表 */}
              <div className="space-y-2">
                {browseWords.map((w, i) => (
                  <div key={i} className="clay-card p-3 bg-gradient-to-br from-indigo-50 to-blue-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-indigo-700">{w.ko}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${topikColors[w.topik]}`}>TOPIK {w.topik}</span>
                          {w.origin && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${originColors[w.origin] || 'bg-gray-100 text-gray-500'}`}>{w.origin}</span>}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{w.zh}</p>
                        {w.originDetail && <p className="text-[10px] text-gray-400 mt-0.5">{w.originDetail}{w.pos ? ` · ${w.pos}` : ''}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => speakKorean(w.ko)} className="w-7 h-7 clay-btn bg-indigo-200 flex items-center justify-center text-xs">🔊</button>
                        <button
                          onClick={() => mistakeBook.addItem({ id: `yw-${w.id}`, type: 'word', content: w.ko, meaning: w.zh, topik: w.topik, origin: w.origin })}
                          className={`w-7 h-7 clay-btn flex items-center justify-center text-xs ${mistakeBook.isSaved(`yw-${w.id}`) ? 'bg-red-200 text-red-600' : 'bg-gray-100 text-gray-400'}`}
                        >
                          {mistakeBook.isSaved(`yw-${w.id}`) ? '❤️' : '🤍'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 默写测试 */}
          {vocabSubTab === 'writing' && (
            <KoreanWritingTest words={dailyWords} speakKorean={speakKorean} />
          )}

          {/* 句型 5 */}
          {vocabSubTab === 'sentences' && (
            <div className="space-y-2">
              <div className="clay-card p-3 bg-gradient-to-br from-purple-100 to-pink-100">
                <p className="text-xs font-bold text-purple-700">💬 今日句型 5 句 · 每句含语法点</p>
              </div>
              {dailySentences.map((s, i) => (
                <div key={i} className="clay-card p-3 bg-gradient-to-br from-purple-50 to-pink-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${topikColors[s.topik]}`}>TOPIK {s.topik}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-600 font-medium">📐 {s.grammar}</span>
                  </div>
                  <p className="text-sm font-bold text-purple-700">{s.ko}</p>
                  <p className="text-[10px] text-purple-400">{s.roman}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.zh}</p>
                  <div className="flex items-center justify-between mt-2">
                    <button onClick={() => speakKorean(s.ko)} className="clay-btn px-3 py-1 bg-purple-200 text-[10px] font-bold text-purple-600">
                      {tts.isSpeaking ? '🔊 播放中...' : '🔊 听发音'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setRecordTarget(`dsentence-${i}`); setShowRecordOverlay(true) }} className="clay-btn px-2 py-1 bg-blue-200 text-[10px] font-bold text-blue-600">🎙 跟读</button>
                      <button
                        onClick={() => mistakeBook.addItem({ id: `sentence-${i}`, type: 'sentence', content: s.ko, roman: s.roman, meaning: s.zh, grammar: s.grammar, topik: s.topik })}
                        className={`w-7 h-7 clay-btn flex items-center justify-center text-xs ${mistakeBook.isSaved(`sentence-${i}`) ? 'bg-red-200 text-red-600' : 'bg-gray-100 text-gray-400'}`}
                        title="加入错题本"
                      >
                        {mistakeBook.isSaved(`sentence-${i}`) ? '❤️' : '🤍'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 语法 5 */}
          {vocabSubTab === 'grammar' && (
            <div className="space-y-2">
              <div className="clay-card p-3 bg-gradient-to-br from-blue-100 to-cyan-100">
                <p className="text-xs font-bold text-blue-700">📐 今日语法 5 个</p>
              </div>
              {dailyGrammar.map((g, i) => (
                <div key={i} className="clay-card p-3 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-700 font-bold">{i + 1}</span>
                    <p className="text-sm font-bold text-blue-700">{g.pattern}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${topikColors[g.topik]}`}>TOPIK {g.topik}</span>
                  </div>
                  <p className="text-xs text-blue-600">{g.meaning}</p>
                  <div className="clay-card p-2 bg-white/50 mt-2">
                    <p className="text-xs text-gray-600">📝 {g.example}</p>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1.5">💡 {g.note}</p>
                  <div className="flex items-center justify-between mt-2">
                    <button onClick={() => speakKorean(g.example.split(' ')[0], 0.7)} className="clay-btn px-3 py-1 bg-blue-200 text-[10px] font-bold text-blue-600">🔊 听例句</button>
                    <button
                      onClick={() => mistakeBook.addItem({ id: `grammar-${i}`, type: 'grammar', content: g.pattern, meaning: g.meaning, example: g.example, topik: g.topik })}
                      className={`w-7 h-7 clay-btn flex items-center justify-center text-xs ${mistakeBook.isSaved(`grammar-${i}`) ? 'bg-red-200 text-red-600' : 'bg-gray-100 text-gray-400'}`}
                      title="加入错题本"
                    >
                      {mistakeBook.isSaved(`grammar-${i}`) ? '❤️' : '🤍'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 错题本 ===== */}
      {activeTab === 'mistake' && (
        <div className="space-y-3">
          <div className="clay-card p-4 bg-gradient-to-br from-red-100 to-pink-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-red-700">📒 我的错题本</p>
                <p className="text-xs text-red-500">收藏难词、易错句型和语法，随时回顾</p>
              </div>
              {mistakeBook.count > 0 && (
                <button onClick={mistakeBook.clearAll} className="clay-btn px-3 py-1 bg-red-200 text-[10px] font-bold text-red-600">清空</button>
              )}
            </div>
          </div>

          {mistakeBook.count === 0 ? (
            <div className="clay-card p-8 bg-gradient-to-br from-gray-50 to-white text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm font-bold text-gray-500">错题本还是空的</p>
              <p className="text-xs text-gray-400 mt-1">在学习词汇、句型、语法时点击 🤍 即可收藏</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mistakeBook.items.map((item) => (
                <div key={item.id} className="clay-card p-3 bg-gradient-to-br from-red-50 to-pink-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          item.type === 'word' ? 'bg-orange-200 text-orange-600' :
                          item.type === 'sentence' ? 'bg-purple-200 text-purple-600' :
                          'bg-blue-200 text-blue-600'
                        }`}>
                          {item.type === 'word' ? '📖 词汇' : item.type === 'sentence' ? '💬 句型' : '📐 语法'}
                        </span>
                        {item.topik && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${topikColors[item.topik]}`}>TOPIK {item.topik}</span>}
                        {item.origin && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${originColors[item.origin] || 'bg-gray-100 text-gray-500'}`}>{item.origin}</span>}
                      </div>
                      <p className="text-sm font-bold text-gray-700">{item.content}</p>
                      {item.roman && <p className="text-[10px] text-gray-400">{item.roman}</p>}
                      {item.meaning && <p className="text-xs text-gray-500">{item.meaning}</p>}
                      {item.example && <p className="text-xs text-blue-600 mt-1">📝 {item.example}</p>}
                      {item.grammar && <p className="text-[10px] text-purple-500 mt-1">📐 {item.grammar}</p>}
                      <p className="text-[9px] text-gray-300 mt-1">复习 {item.reviewCount} 次</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => speakKorean(item.content, 0.7)} className="w-7 h-7 clay-btn bg-orange-200 flex items-center justify-center text-xs">🔊</button>
                      <button onClick={() => mistakeBook.markReviewed(item.id)} className="w-7 h-7 clay-btn bg-green-200 flex items-center justify-center text-xs">✅</button>
                      <button onClick={() => mistakeBook.removeItem(item.id)} className="w-7 h-7 clay-btn bg-gray-200 flex items-center justify-center text-xs">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 小测验 ===== */}
      {activeTab === 'quiz' && (
        <div className="space-y-3">
          <div className="clay-card p-4 bg-gradient-to-br from-green-100 to-emerald-100 text-center">
            <p className="text-sm font-bold text-green-700 mb-1">📝 综合小测验</p>
            <p className="text-xs text-green-600">从延世词库随机出题 · 共 {quizQuestions.length} 题</p>
          </div>

          {!quizDone ? (
            <div className="clay-card p-6 bg-gradient-to-br from-white/80 to-green-50 text-center">
              <p className="text-[10px] text-gray-400 mb-1">题目 {quizIndex + 1} / {quizQuestions.length}</p>
              <div className="flex justify-center gap-1 mb-3">
                {quizQuestions.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < quizIndex ? 'bg-green-400' : i === quizIndex ? 'bg-orange-400' : 'bg-gray-200'}`} />
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-base font-bold text-green-700">{quizQuestions[quizIndex].question}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${topikColors[quizQuestions[quizIndex].topik]}`}>TOPIK {quizQuestions[quizIndex].topik}</span>
              </div>
              <div className="space-y-2">
                {quizQuestions[quizIndex].options.map((opt, j) => (
                  <button
                    key={j}
                    onClick={() => handleQuizSelect(j)}
                    disabled={quizCorrect !== null}
                    className={`w-full clay-btn p-3 text-sm font-bold text-center transition-all ${
                      quizCorrect === null
                        ? 'bg-gradient-to-r from-white to-green-50 text-gray-700 hover:from-green-100'
                        : j === quizQuestions[quizIndex].answer
                          ? 'bg-gradient-to-r from-green-200 to-emerald-200 text-green-700'
                          : j === quizAnswer
                            ? 'bg-gradient-to-r from-red-200 to-red-300 text-red-700'
                            : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {String.fromCharCode(65 + j)}. {opt}
                  </button>
                ))}
              </div>
              {quizCorrect !== null && (
                <div className={`mt-3 p-2 rounded-2xl ${quizCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <p className="text-sm font-bold">{quizCorrect ? '✅ 正确！' : '❌ 答错了'}</p>
                </div>
              )}
              {quizCorrect !== null && (
                <button onClick={nextQuiz} className="mt-3 clay-btn w-full py-3 bg-gradient-to-br from-blue-300 to-cyan-300 text-sm font-bold text-blue-700">
                  {quizIndex < quizQuestions.length - 1 ? '下一题 →' : '查看成绩'}
                </button>
              )}
            </div>
          ) : (
            <div className="clay-card p-6 bg-gradient-to-br from-green-100 to-emerald-100 text-center">
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-2xl font-bold text-green-700">{quizScore} / {quizQuestions.length}</p>
              <p className="text-sm text-green-600 mt-1">
                {quizScore === quizQuestions.length ? '满分！太棒了！' : quizScore >= 7 ? '不错，继续加油！' : '再复习一下吧～'}
              </p>
              <button onClick={resetQuiz} className="mt-4 clay-btn px-6 py-2 bg-gradient-to-br from-blue-300 to-cyan-300 text-sm font-bold text-blue-700">重新测试</button>
            </div>
          )}
        </div>
      )}

      {/* ===== 录音弹窗 ===== */}
      {showRecordOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { recorder.stopRecording(); setShowRecordOverlay(false); recorder.resetRecording() }} />
          <div className="relative w-[85%] max-w-sm clay-card p-6 bg-gradient-to-b from-orange-50 to-amber-50 text-center">
            <p className="text-sm font-bold text-orange-700 mb-1">🎙 跟读练习</p>
            <p className="text-xs text-orange-500 mb-4">点击下方按钮开始录音</p>

            {recorder.isRecording && (
              <div className="mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-300 to-red-400 flex items-center justify-center mx-auto animate-pulse-soft">
                  <span className="text-xl font-bold text-white">{recorder.formatDuration(recorder.duration)}</span>
                </div>
                <p className="text-xs text-red-500 mt-2">录音中...</p>
              </div>
            )}

            {recorder.audioUrl && !recorder.isRecording && (
              <div className="mb-4">
                <div className="clay-card p-3 bg-green-100">
                  <p className="text-xs text-green-700 font-bold mb-2">✅ 录音完成</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={recorder.playRecording} className="clay-btn w-10 h-10 bg-green-200 flex items-center justify-center text-green-700">▶</button>
                    <button onClick={recorder.resetRecording} className="clay-btn w-10 h-10 bg-gray-200 flex items-center justify-center text-gray-600">🔄</button>
                  </div>
                </div>
              </div>
            )}

            {recorder.error && <p className="text-xs text-red-500 mb-3">{recorder.error}</p>}

            <div className="flex items-center justify-center gap-3">
              {!recorder.isRecording ? (
                <button onClick={recorder.startRecording} className="clay-btn w-14 h-14 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center text-white text-2xl shadow-lg">🎙</button>
              ) : (
                <button onClick={recorder.stopRecording} className="clay-btn w-14 h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-2xl">⏹</button>
              )}
            </div>

            <button onClick={() => { recorder.stopRecording(); setShowRecordOverlay(false); recorder.resetRecording() }} className="mt-4 text-xs text-gray-400 underline">关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}
