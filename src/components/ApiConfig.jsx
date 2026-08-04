import { useState } from 'react'

export default function ApiConfig({ isOpen, onClose, config, onSave }) {
  const [apiKey, setApiKey] = useState(config?.apiKey || '')
  const [model, setModel] = useState(config?.model || 'qwen-plus')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleSave = () => {
    onSave({ apiKey, model })
    onClose()
  }

  const handleTest = async () => {
    if (!apiKey) {
      setTestResult({ ok: false, msg: '请输入 API Key' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      })

      if (res.ok) {
        setTestResult({ ok: true, msg: '连接成功！' })
      } else {
        const err = await res.json().catch(() => ({}))
        setTestResult({ ok: false, msg: err.error?.message || `错误 ${res.status}` })
      }
    } catch (err) {
      setTestResult({ ok: false, msg: '网络错误: ' + err.message })
    } finally {
      setTesting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm clay-card p-6 bg-gradient-to-b from-blue-50 to-indigo-50 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-indigo-700">AI 设置</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">通义千问 API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              从 <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">阿里云百炼平台</a> 获取
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">模型选择</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="qwen-plus">qwen-plus（推荐，性价比高）</option>
              <option value="qwen-max">qwen-max（最强，较慢）</option>
              <option value="qwen-turbo">qwen-turbo（最快，简单任务）</option>
            </select>
          </div>

          {testResult && (
            <div className={`text-xs px-3 py-2 rounded-xl ${testResult.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {testResult.ok ? '✅' : '❌'} {testResult.msg}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex-1 clay-btn py-2 bg-gradient-to-br from-blue-200 to-cyan-200 text-xs font-bold text-blue-700 disabled:opacity-50"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 clay-btn py-2 bg-gradient-to-br from-indigo-300 to-purple-300 text-xs font-bold text-white"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
