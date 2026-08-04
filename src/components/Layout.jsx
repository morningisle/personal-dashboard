import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAI } from '../contexts/AIContext'
import ApiConfig from './ApiConfig'

const tabs = [
  { to: '/', label: '首页', icon: '🏠', activeIcon: '🏡' },
  { to: '/compass', label: '罗盘', icon: '🧭', activeIcon: '🧭' },
  { to: '/english', label: '英语', icon: '🇬🇧', activeIcon: '🇬🇧' },
  { to: '/korean', label: '韩语', icon: '🇰🇷', activeIcon: '🇰🇷' },
  { to: '/achievement', label: '成就', icon: '🏆', activeIcon: '🏆' },
]

const drawerQuickStats = [
  { label: '首页', value: '复盘 · 日报', to: '/' },
  { label: '罗盘', value: '四象限任务', to: '/compass' },
  { label: '英语', value: '词汇 · 听说写', to: '/english' },
  { label: '韩语', value: '延世词库', to: '/korean' },
  { label: '成就', value: 'Deft · 目标', to: '/achievement' },
]

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const ai = useAI()

  return (
    <div className="h-full flex flex-col ipad-landscape:flex-row bg-gradient-to-br from-pink-50 via-amber-50 to-green-50 relative overflow-hidden">
      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="drawer-overlay fixed inset-0 z-40 ipad-landscape:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Side Drawer (mobile only) */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-50 bg-gradient-to-b from-pink-100 via-amber-50 to-green-50 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ipad-landscape:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          borderRadius: '0 28px 28px 0',
          boxShadow: drawerOpen
            ? '8px 0 24px rgba(0,0,0,0.12), inset -2px 0 8px rgba(0,0,0,0.05)'
            : 'none',
        }}
      >
        <div className="p-6 pt-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-pink-600">📊 快捷面板</h2>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-600 text-sm font-bold clay-btn"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {drawerQuickStats.map((stat) => (
              <div
                key={stat.label}
                onClick={() => { navigate(stat.to); setDrawerOpen(false) }}
                className="clay-card p-4 bg-gradient-to-r from-white/80 to-white/40 flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">{stat.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-800">{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 clay-card p-4 bg-gradient-to-br from-pink-200 to-pink-300">
            <p className="text-xs text-pink-600 font-medium mb-2">今日打卡</p>
            <div className="flex gap-2">
              {['复盘', '英语', '韩语'].map((item, i) => (
                <div
                  key={item}
                  className={`flex-1 text-center py-2 rounded-2xl text-xs font-bold transition-all ${
                    i < 2
                      ? 'bg-white/60 text-pink-700'
                      : 'bg-pink-400/30 text-pink-400'
                  }`}
                >
                  {i < 2 ? '✅' : '⬜'} {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== iPad 横屏：左侧导航栏 ===== */}
      <aside className="hidden ipad-landscape:flex flex-col w-[200px] flex-shrink-0 h-full bg-gradient-to-b from-pink-100/80 via-amber-50/80 to-green-50/80 border-r border-pink-200/30"
        style={{
          boxShadow: '4px 0 16px rgba(0,0,0,0.04)',
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-lg font-bold text-pink-600">🎯 个人工作台</h1>
          <p className="text-[10px] text-pink-400 mt-0.5">学习 · 复盘 · 成长</p>
        </div>

        {/* Nav Tabs */}
        <nav className="flex-1 px-3 space-y-1.5">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.to
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isActive
                    ? 'clay-tab-active bg-gradient-to-r from-pink-200 to-pink-300 scale-[1.02]'
                    : 'hover:bg-white/50'
                }`}
              >
                <span className={`text-xl transition-transform duration-300 ${isActive ? 'animate-bounce-clay' : ''}`}>
                  {isActive ? tab.activeIcon : tab.icon}
                </span>
                <span className={`text-sm font-bold ${isActive ? 'text-pink-700' : 'text-gray-500'}`}>
                  {tab.label}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* Quick Stats at bottom */}
        <div className="px-3 pb-4 space-y-2">
          <div className="clay-card p-3 bg-gradient-to-r from-white/80 to-white/40">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">🔥</span>
              <span className="text-[10px] font-bold text-gray-600">连续打卡</span>
            </div>
            <p className="text-lg font-bold text-pink-600">12<span className="text-xs text-pink-400"> 天</span></p>
          </div>
          <div className="flex gap-1.5">
            {['复盘', '英语', '韩语'].map((item, i) => (
              <div
                key={item}
                className={`flex-1 text-center py-1.5 rounded-xl text-[9px] font-bold ${
                  i < 2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i < 2 ? '✅' : '⬜'} {item}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ===== 主内容区域 ===== */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Bar - 在 iPad 上简化 */}
        <header className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center justify-between ipad-landscape:px-6 ipad-landscape:pt-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 clay-btn bg-gradient-to-br from-pink-200 to-pink-300 flex items-center justify-center ipad-landscape:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-pink-700">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="16" y2="12" />
              <line x1="3" y1="18" x2="19" y2="18" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-700 ipad-landscape:text-lg ipad-landscape:hidden">
            {tabs.find(t => t.to === location.pathname)?.label || '首页'}
          </h1>
          <div className="flex items-center gap-2">
            <div className="hidden ipad-landscape:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/60">
              <span className="text-xs text-gray-500">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
            </div>
            {/* AI 配置入口 */}
            <button
              onClick={() => setShowApiConfig(true)}
              className={`w-10 h-10 clay-btn flex items-center justify-center text-lg ${ai.isConfigured ? 'bg-gradient-to-br from-green-200 to-emerald-200' : 'bg-gradient-to-br from-amber-200 to-amber-300'}`}
              title={ai.isConfigured ? 'AI 已配置' : '点击配置 AI API'}
            >
              {ai.isConfigured ? '🤖' : '⚙️'}
            </button>
          </div>
        </header>

        {/* Main Content - iPad 双列 */}
        <main className="flex-1 overflow-y-auto px-4 pb-4 ipad-landscape:px-6 ipad-landscape:pb-6">
          <Outlet />
        </main>
      </div>

      {/* 全局 AI 配置弹窗 */}
      <ApiConfig
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
        config={ai.config}
        onSave={ai.updateConfig}
      />

      {/* Bottom Tab Bar - 仅移动端 */}
      <nav className="flex-shrink-0 px-3 pb-2 ipad-landscape:hidden">
        <div
          className="clay-card bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm flex items-center justify-around py-2"
          style={{ borderRadius: '24px' }}
        >
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.to
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isActive
                    ? 'clay-tab-active bg-gradient-to-b from-pink-200 to-pink-300 scale-105'
                    : 'hover:bg-white/50'
                }`}
              >
                <span className={`text-lg transition-transform duration-300 ${isActive ? 'animate-bounce-clay' : ''}`}>
                  {isActive ? tab.activeIcon : tab.icon}
                </span>
                <span className={`text-[9px] font-bold ${isActive ? 'text-pink-700' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
