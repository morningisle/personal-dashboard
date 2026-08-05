import { useState, useRef, useCallback, useEffect } from 'react'

// 浏览器语音识别 Hook
export function useVoiceRecognition(options = {}) {
  const { onUtteranceComplete, continuous = false } = options
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const stoppedBySilenceRef = useRef(false)
  const hasHadSpeechRef = useRef(false)
  const transcriptRef = useRef('')
  const onCompleteRef = useRef(onUtteranceComplete)
  onCompleteRef.current = onUtteranceComplete

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('当前浏览器不支持语音识别，请使用 Chrome 或 Edge')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = 'zh-CN'

    recognition.onresult = (event) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (final) {
        transcriptRef.current += final
        setTranscript(transcriptRef.current)
      }
      setInterimTranscript(interim)

      if (final || interim.trim()) {
        hasHadSpeechRef.current = true
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
      }

      if (hasHadSpeechRef.current && !interim.trim() && !final && !silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          stoppedBySilenceRef.current = true
          recognition.stop()
        }, 1200)
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        setError(`语音识别错误: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      if (stoppedBySilenceRef.current) {
        stoppedBySilenceRef.current = false
        const text = transcriptRef.current.trim()
        if (text && onCompleteRef.current) {
          onCompleteRef.current(text)
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [continuous])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    setError(null)
    transcriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    hasHadSpeechRef.current = false
    stoppedBySilenceRef.current = false
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch (e) {
      // 已经在监听中
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    recognitionRef.current.stop()
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    transcriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    supported: !!recognitionRef.current,
  }
}