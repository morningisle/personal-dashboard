const stats = [
  { label: '连续打卡', value: '12', unit: '天', icon: '🔥', color: 'from-orange-200 to-amber-200' },
  { label: '累计复盘', value: '28', unit: '次', icon: '💭', color: 'from-purple-200 to-pink-200' },
  { label: '英语词汇', value: '2,340', unit: '个', icon: '📖', color: 'from-blue-200 to-indigo-200' },
  { label: '韩语词汇', value: '186', unit: '个', icon: '📝', color: 'from-green-200 to-emerald-200' },
]

const petStates = [
  { mood: '开心', icon: '😊', level: 5, exp: 72, maxExp: 100 },
]

const weeklyGoal = [
  { label: '每日复盘', done: 5, target: 7, icon: '💭' },
  { label: '英语打卡', done: 6, target: 7, icon: '📖' },
  { label: '韩语打卡', done: 4, target: 7, icon: '📝' },
]

export default function Achievement() {
  const pet = petStates[0]

  return (
    <div className="space-y-4 pb-4">
      {/* Pet Companion */}
      <div className="clay-card p-5 bg-gradient-to-br from-pink-100 to-purple-100 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center clay-glow animate-float overflow-hidden">
          <img src="./icons/deft.jpg" alt="Deft" className="w-full h-full object-cover" />
        </div>
        <p className="text-base font-bold text-purple-700 mt-2">Deft</p>
        <p className="text-xs text-purple-500">Lv.{pet.level} · {pet.mood}</p>
        <div className="mt-2 mx-auto max-w-[200px]">
          <div className="clay-progress h-3 bg-purple-100">
            <div className="clay-progress-bar h-full bg-gradient-to-r from-pink-400 to-purple-400" style={{ width: `${(pet.exp / pet.maxExp) * 100}%` }} />
          </div>
          <p className="text-[10px] text-purple-400 mt-1">EXP {pet.exp}/{pet.maxExp}</p>
        </div>
        <p className="text-[10px] text-purple-400 mt-1">完成每日打卡可以喂养 Deft 哦～</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`clay-card p-4 bg-gradient-to-br ${stat.color} text-center`}>
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
            <p className="text-[10px] text-gray-500">{stat.label} ({stat.unit})</p>
          </div>
        ))}
      </div>

      {/* Weekly Goals */}
      <div className="clay-card p-4 bg-gradient-to-br from-blue-100 to-cyan-100">
        <p className="text-sm font-bold text-blue-700 mb-3">📊 本周目标</p>
        <div className="space-y-3">
          {weeklyGoal.map((goal) => (
            <div key={goal.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-blue-600 font-medium">{goal.icon} {goal.label}</span>
                <span className="text-xs font-bold text-blue-700">{goal.done}/{goal.target}</span>
              </div>
              <div className="clay-progress h-2.5 bg-blue-100">
                <div
                  className="clay-progress-bar h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                  style={{ width: `${(goal.done / goal.target) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivation */}
      <div className="clay-card p-4 bg-gradient-to-br from-green-100 to-emerald-100 text-center">
        <p className="text-3xl mb-2">🌈</p>
        <p className="text-sm font-bold text-green-700">「不积跬步，无以至千里」</p>
        <p className="text-xs text-green-600 mt-1">你已经连续学习 12 天了，继续加油！</p>
        <div className="mt-3 flex justify-center gap-2">
          <span className="text-[10px] px-3 py-1 rounded-full bg-green-200 text-green-700 font-bold">分享成就</span>
          <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-200 text-emerald-700 font-bold">设置目标</span>
        </div>
      </div>
    </div>
  )
}
