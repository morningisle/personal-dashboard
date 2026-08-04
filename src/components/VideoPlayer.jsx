import { useState } from 'react'

/**
 * 通用视频播放器
 * 支持：B站 (BV号)、YouTube、直链视频
 * 可通过 url 属性直接传入，或通过 bvid/youtubeId 快捷传入
 */
export default function VideoPlayer({ bvid, youtubeId, videoUrl, title, onUrlChange }) {
  const [customUrl, setCustomUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [activeUrl, setActiveUrl] = useState(videoUrl || null)

  // 解析 URL 类型
  const detectVideoType = (url) => {
    if (!url) return null
    if (url.includes('bilibili.com') || url.includes('b23.tv')) {
      const bvMatch = url.match(/BV[\w]+/)
      if (bvMatch) return { type: 'bilibili', id: bvMatch[0] }
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const ytMatch = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/)
      if (ytMatch) return { type: 'youtube', id: ytMatch[1] }
    }
    if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) {
      return { type: 'direct', url }
    }
    return { type: 'bilibili', id: url } // fallback: treat as BV号
  }

  // 确定当前播放源
  let source = null
  if (activeUrl) {
    source = detectVideoType(activeUrl)
  } else if (bvid) {
    source = { type: 'bilibili', id: bvid }
  } else if (youtubeId) {
    source = { type: 'youtube', id: youtubeId }
  }

  const handleUrlSubmit = () => {
    if (!customUrl.trim()) return
    const detected = detectVideoType(customUrl.trim())
    if (detected) {
      setActiveUrl(customUrl.trim())
      if (onUrlChange) onUrlChange(customUrl.trim())
      setShowUrlInput(false)
      setCustomUrl('')
    }
  }

  const getEmbedSrc = () => {
    if (!source) return null
    switch (source.type) {
      case 'bilibili':
        return `https://player.bilibili.com/player.html?bvid=${source.id}&high_quality=1&danmaku=0&autoplay=0`
      case 'youtube':
        return `https://www.youtube.com/embed/${source.id}?rel=0`
      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      {/* 播放器区域 */}
      <div className="w-full rounded-2xl overflow-hidden clay-card bg-gray-900 relative" style={{ paddingBottom: '56.25%' }}>
        {source ? (
          source.type === 'direct' ? (
            <video
              src={source.url}
              controls
              className="absolute inset-0 w-full h-full object-contain"
              title={title}
            />
          ) : (
            <iframe
              src={getEmbedSrc()}
              className="absolute inset-0 w-full h-full"
              scrolling="no"
              border="0"
              frameBorder="no"
              framespacing="0"
              allowFullScreen={true}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={title || 'video player'}
            />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <span className="text-4xl mb-2">🎬</span>
            <p className="text-xs">点击下方按钮添加视频链接</p>
          </div>
        )}
      </div>

      {/* 控制栏 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="clay-btn px-3 py-1.5 bg-gradient-to-r from-blue-200 to-indigo-200 text-[10px] font-bold text-blue-700"
        >
          {showUrlInput ? '收起' : '🔗 粘贴视频链接'}
        </button>
        {activeUrl && (
          <span className="text-[9px] text-gray-400 truncate flex-1">
            {source?.type === 'bilibili' ? '📺 B站' : source?.type === 'youtube' ? '📺 YouTube' : '📹 本地视频'}
            {source?.id ? ` · ${source.id}` : ''}
          </span>
        )}
      </div>

      {/* URL 输入框 */}
      {showUrlInput && (
        <div className="clay-card p-3 bg-gradient-to-br from-blue-50 to-indigo-50 space-y-2">
          <p className="text-[10px] font-bold text-blue-600">支持 B站 / YouTube / 直链视频</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="粘贴视频页面 URL，如 bilibili.com/video/BV..."
              className="flex-1 clay-input px-3 py-2 text-xs bg-white/80"
            />
            <button
              onClick={handleUrlSubmit}
              className="clay-btn px-4 py-2 bg-gradient-to-r from-blue-300 to-indigo-300 text-xs font-bold text-blue-700"
            >
              播放
            </button>
          </div>
          <p className="text-[9px] text-gray-400">
            💡 B站：复制视频页URL · YouTube：复制视频链接 · 直链：.mp4/.webm 地址
          </p>
        </div>
      )}
    </div>
  )
}
