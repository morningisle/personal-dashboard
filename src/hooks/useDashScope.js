import { useState, useCallback, useRef } from 'react'

const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const STORAGE_KEY = 'dashscope-config'

// 获取存储的配置
const getConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : { apiKey: '', model: 'qwen-plus' }
  } catch {
    return { apiKey: '', model: 'qwen-plus' }
  }
}

const saveConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function useDashScope() {
  const [config, setConfig] = useState(getConfig)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [streamText, setStreamText] = useState('')
  const abortRef = useRef(null)

  const updateConfig = useCallback((newConfig) => {
    const merged = { ...config, ...newConfig }
    setConfig(merged)
    saveConfig(merged)
  }, [config])

  const isConfigured = Boolean(config.apiKey)

  // 非流式调用
  const chat = useCallback(async (messages, options = {}) => {
    if (!config.apiKey) {
      setError('请先配置 API Key')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || config.model || 'qwen-plus',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2000,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error?.message || `API 错误: ${res.status}`)
      }

      const data = await res.json()
      return data.choices?.[0]?.message?.content || ''
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [config])

  // 流式调用
  const chatStream = useCallback(async (messages, options = {}) => {
    if (!config.apiKey) {
      setError('请先配置 API Key')
      return null
    }

    setIsLoading(true)
    setError(null)
    setStreamText('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || config.model || 'qwen-plus',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2000,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error?.message || `API 错误: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            if (delta) {
              fullText += delta
              setStreamText(fullText)
            }
          } catch { /* skip parse errors */ }
        }
      }

      return fullText
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
      }
      return null
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [config])

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsLoading(false)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    config,
    updateConfig,
    isConfigured,
    isLoading,
    error,
    clearError,
    streamText,
    chat,
    chatStream,
    abort,
  }
}
