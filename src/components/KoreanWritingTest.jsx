import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * 韩语词汇默写测试组件
 * - 显示目标词汇，用户在 Canvas 上手写
 * - 支持 Apple Pencil / 触控 / 鼠标
 * - 可显示参考字对比
 */
export default function KoreanWritingTest({ words = [], speakKorean }) {
  const canvasRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [showReference, setShowReference] = useState(false)
  const [result, setResult] = useState(null) // 'correct' | 'wrong' | null
  const [penColor, setPenColor] = useState('#1e293b')
  const [penSize, setPenSize] = useState(4)
  const [completed, setCompleted] = useState({}) // { index: 'correct'|'wrong' }
  const lastPos = useRef(null)

  const currentWord = words[currentIndex]

  // 初始化 Canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    // 画田字格参考线
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    // 横线
    ctx.beginPath()
    ctx.moveTo(0, rect.height / 2)
    ctx.lineTo(rect.width, rect.height / 2)
    ctx.stroke()
    // 竖线
    ctx.beginPath()
    ctx.moveTo(rect.width / 2, 0)
    ctx.lineTo(rect.width / 2, rect.height)
    ctx.stroke()
    ctx.setLineDash([])

    setHasDrawn(false)
  }, [])

  useEffect(() => {
    initCanvas()
  }, [initCanvas, currentIndex])

  // 获取绘图坐标
  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  // 开始绘制
  const startDraw = (e) => {
    e.preventDefault()
    setIsDrawing(true)
    const pos = getPos(e)
    lastPos.current = pos
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  // 绘制中
  const draw = (e) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e)
    ctx.strokeStyle = penColor
    ctx.lineWidth = penSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setHasDrawn(true)
  }

  // 结束绘制
  const endDraw = (e) => {
    e.preventDefault()
    setIsDrawing(false)
  }

  // 清除画布
  const clearCanvas = () => {
    initCanvas()
    setResult(null)
  }

  // 标记正确/错误
  const markResult = (r) => {
    setResult(r)
    setCompleted(prev => ({ ...prev, [currentIndex]: r }))
  }

  // 下一个
  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setResult(null)
      setShowReference(false)
    }
  }

  // 上一个
  const prevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setResult(null)
      setShowReference(false)
    }
  }

  // 统计
  const correctCount = Object.values(completed).filter(v => v === 'correct').length
  const wrongCount = Object.values(completed).filter(v => v === 'wrong').length

  if (!words.length) {
    return (
      <div className="clay-card p-8 text-center bg-gradient-to-br from-gray-50 to-white">
        <p className="text-4xl mb-3">📝</p>
        <p className="text-sm font-bold text-gray-500">暂无词汇数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 标题和进度 */}
      <div className="clay-card p-3 bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-violet-700">✍️ 词汇默写</p>
          <p className="text-[10px] text-violet-500">遮住词汇，用手写练习韩文字</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-200 text-green-700 font-bold">✅ {correctCount}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-200 text-red-700 font-bold">❌ {wrongCount}</span>
          <span className="text-[10px] text-gray-400">{currentIndex + 1}/{words.length}</span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="flex gap-0.5">
        {words.map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
            completed[i] === 'correct' ? 'bg-green-400' :
            completed[i] === 'wrong' ? 'bg-red-400' :
            i === currentIndex ? 'bg-violet-400' : 'bg-gray-200'
          }`} />
        ))}
      </div>

      {/* 目标词汇（可隐藏） */}
      <div className="clay-card p-4 bg-gradient-to-br from-white/80 to-violet-50 text-center">
        <p className="text-[10px] text-gray-400 mb-1">
          {showReference ? '👀 参考字已显示' : '🙈 遮住参考字，试着默写'}
        </p>
        <p className={`text-3xl font-bold text-violet-700 transition-opacity ${showReference ? 'opacity-100' : 'opacity-0 select-none'}`}>
          {currentWord.word || currentWord.ko}
        </p>
        <p className={`text-xs text-gray-500 mt-1 transition-opacity ${showReference ? 'opacity-100' : 'opacity-0'}`}>
          {currentWord.meaning || currentWord.zh}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <button
            onClick={() => setShowReference(!showReference)}
            className={`clay-btn px-4 py-1.5 text-[10px] font-bold ${showReference ? 'bg-violet-200 text-violet-700' : 'bg-gray-200 text-gray-500'}`}
          >
            {showReference ? '🙈 隐藏参考' : '👀 显示参考'}
          </button>
          {speakKorean && (
            <button
              onClick={() => speakKorean(currentWord.word || currentWord.ko)}
              className="clay-btn px-3 py-1.5 bg-orange-200 text-[10px] font-bold text-orange-700"
            >
              🔊 听发音
            </button>
          )}
        </div>
      </div>

      {/* Canvas 书写区 */}
      <div className="clay-card p-3 bg-white">
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl cursor-crosshair touch-none"
          style={{ height: '200px', background: '#fefefe' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {/* 工具栏 */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {/* 笔颜色 */}
            {['#1e293b', '#dc2626', '#2563eb', '#7c3aed'].map(c => (
              <button
                key={c}
                onClick={() => setPenColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${penColor === c ? 'border-violet-500 scale-110' : 'border-gray-200'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            {/* 笔粗细 */}
            <select value={penSize} onChange={e => setPenSize(Number(e.target.value))} className="text-[10px] clay-input px-2 py-1 bg-white/80">
              <option value={2}>细</option>
              <option value={4}>中</option>
              <option value={8}>粗</option>
            </select>
          </div>
          <button onClick={clearCanvas} className="clay-btn px-3 py-1 bg-gray-200 text-[10px] font-bold text-gray-600">
            🗑 清除
          </button>
        </div>
      </div>

      {/* 自评按钮 */}
      {hasDrawn && !result && (
        <div className="flex gap-3">
          <button
            onClick={() => markResult('correct')}
            className="flex-1 clay-btn py-3 bg-gradient-to-r from-green-200 to-emerald-200 text-sm font-bold text-green-700"
          >
            ✅ 写对了
          </button>
          <button
            onClick={() => markResult('wrong')}
            className="flex-1 clay-btn py-3 bg-gradient-to-r from-red-200 to-pink-200 text-sm font-bold text-red-700"
          >
            ❌ 写错了
          </button>
        </div>
      )}

      {result && (
        <div className={`clay-card p-3 text-center ${result === 'correct' ? 'bg-green-100' : 'bg-red-100'}`}>
          <p className="text-sm font-bold">{result === 'correct' ? '✅ 很好！继续下一个' : `❌ 再写一次吧！正确答案：${currentWord.word || currentWord.ko}`}</p>
          {result === 'wrong' && (
            <button onClick={clearCanvas} className="mt-2 clay-btn px-4 py-1.5 bg-white text-xs font-bold text-gray-600">
              🔄 重新写
            </button>
          )}
        </div>
      )}

      {/* 导航 */}
      <div className="flex gap-3">
        <button
          onClick={prevWord}
          disabled={currentIndex === 0}
          className={`flex-1 clay-btn py-2.5 text-xs font-bold ${currentIndex === 0 ? 'bg-gray-100 text-gray-300' : 'bg-gradient-to-r from-blue-200 to-indigo-200 text-blue-700'}`}
        >
          ← 上一个
        </button>
        <button
          onClick={nextWord}
          disabled={currentIndex === words.length - 1}
          className={`flex-1 clay-btn py-2.5 text-xs font-bold ${currentIndex === words.length - 1 ? 'bg-gray-100 text-gray-300' : 'bg-gradient-to-r from-blue-200 to-indigo-200 text-blue-700'}`}
        >
          下一个 →
        </button>
      </div>
    </div>
  )
}
