import { useState, useRef, useCallback, useEffect } from 'react'

// 浏览器语音合成 Hook (TTS)
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const utteranceRef = useRef(null)

  useEffect(() => {
    if (!window.speechSynthesis) return

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      setVoices(availableVoices)
      
      // 优先选择中文女声
      const zhVoice = availableVoices.find(v => v.lang.includes('zh') && v.name.includes('Female'))
        || availableVoices.find(v => v.lang.includes('zh-CN'))
        || availableVoices.find(v => v.lang.includes('zh'))
        || availableVoices[0]
      
      if (zhVoice) setSelectedVoice(zhVoice)
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const speak = useCallback((text, options = {}) => {
    if (!window.speechSynthesis || !text) return

    // 停止当前播放
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const lang = options.lang || 'zh-CN'
    
    // 根据语言动态选择语音
    let voice = null
    if (lang.startsWith('ko')) {
      voice = voices.find(v => v.lang.includes('ko')) || voices.find(v => v.lang.includes('zh')) || voices[0]
    } else if (lang.startsWith('en')) {
      voice = voices.find(v => v.lang.includes('en') && v.name.includes('Female'))
        || voices.find(v => v.lang.includes('en-US'))
        || voices.find(v => v.lang.includes('en'))
        || voices[0]
    } else {
      voice = selectedVoice || voices.find(v => v.lang.includes('zh')) || voices[0]
    }
    
    utterance.voice = voice
    utterance.lang = lang
    utterance.rate = options.rate || 0.9
    utterance.pitch = options.pitch || 1.0
    utterance.volume = options.volume || 1.0

    utterance.onstart = () => {
      setIsSpeaking(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setIsPaused(false)
    }

    utterance.onerror = (e) => {
      console.error('TTS error:', e)
      setIsSpeaking(false)
      setIsPaused(false)
    }

    utterance.onpause = () => setIsPaused(true)
    utterance.onresume = () => setIsPaused(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [selectedVoice, voices])

  const pause = useCallback(() => {
    if (window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.pause()
    }
  }, [isSpeaking])

  const resume = useCallback(() => {
    if (window.speechSynthesis && isPaused) {
      window.speechSynthesis.resume()
    }
  }, [isPaused])

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [])

  const changeVoice = useCallback((voice) => {
    setSelectedVoice(voice)
  }, [])

  return {
    speak,
    pause,
    resume,
    stop,
    changeVoice,
    isSpeaking,
    isPaused,
    voices,
    selectedVoice,
    supported: !!window.speechSynthesis,
  }
}
