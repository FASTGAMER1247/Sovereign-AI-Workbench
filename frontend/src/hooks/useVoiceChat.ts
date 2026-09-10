import { useState, useEffect, useRef, useCallback } from 'react'
import { transcribeVoice } from '../api/client'

// Type declarations for browser Web Speech Recognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => any) | null
  onend: ((this: SpeechRecognitionInstance, ev: Event) => any) | null
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => any) | null
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => any) | null
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognitionInstance }
    webkitSpeechRecognition?: { new (): SpeechRecognitionInstance }
  }
}

export interface UseVoiceChatOptions {
  onTranscriptChange?: (text: string) => void
  onTranscriptFinal?: (text: string) => void
}

export function useVoiceChat(options?: UseVoiceChatOptions) {
  // Speech Recognition (STT) State
  const [isListening, setIsListening] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  // Text-to-Speech (TTS) State
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem('sov_voice_name') || ''
  })
  const [speechRate, setSpeechRate] = useState<number>(() => {
    const saved = localStorage.getItem('sov_voice_rate')
    return saved ? parseFloat(saved) : 1.0
  })
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    return localStorage.getItem('sov_voice_autospeak') === 'true'
  })

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        setAvailableVoices(voices)
        if (!selectedVoiceName) {
          // Prefer Microsoft David or Zira, or English voices
          const preferred =
            voices.find((v) => v.name.includes('David') || v.name.includes('Zira')) ||
            voices.find((v) => v.lang.startsWith('en')) ||
            voices[0]
          if (preferred) {
            setSelectedVoiceName(preferred.name)
            localStorage.setItem('sov_voice_name', preferred.name)
          }
        }
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [selectedVoiceName])

  // Recording timer
  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0)
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isListening])

  // Start Voice Dictation
  const startListening = useCallback(async () => {
    setSpeechError(null)

    // Strategy 1: Browser Web Speech Recognition (Real-time live streaming)
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        let fullTranscript = ''

        recognition.onstart = () => {
          setIsListening(true)
        }

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i]
            if (res.isFinal) {
              fullTranscript += res[0].transcript + ' '
              options?.onTranscriptFinal?.(fullTranscript.trim())
            } else {
              interim += res[0].transcript
            }
          }

          const currentText = (fullTranscript + interim).trim()
          options?.onTranscriptChange?.(currentText)
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('[VoiceChat] SpeechRecognition error:', event.error)
          if (event.error !== 'no-speech') {
            setSpeechError(`Voice error: ${event.error}`)
          }
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognition.start()
        recognitionRef.current = recognition
        return
      } catch (err) {
        console.warn('[VoiceChat] SpeechRecognition init failed, falling back to MediaRecorder:', err)
      }
    }

    // Strategy 2: MediaRecorder with Backend Whisper STT Fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        setIsListening(false)
        stream.getTracks().forEach((track) => track.stop())

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        if (audioBlob.size > 100) {
          try {
            const res = await transcribeVoice(audioBlob)
            if (res.text) {
              options?.onTranscriptChange?.(res.text)
              options?.onTranscriptFinal?.(res.text)
            }
          } catch (sttErr: any) {
            setSpeechError(sttErr.message || 'Transcription failed.')
          }
        }
      }

      recorder.start(250)
      mediaRecorderRef.current = recorder
      setIsListening(true)
    } catch (micErr: any) {
      setSpeechError(`Microphone access error: ${micErr.message || 'Permission denied'}`)
      setIsListening(false)
    }
  }, [options])

  // Stop Voice Dictation
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
      mediaRecorderRef.current = null
    }

    setIsListening(false)
  }, [])

  // Text-to-Speech: Speak text aloud
  const speakText = useCallback(
    (text: string, messageId?: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return

      // If already speaking this message, toggle stop
      if (isSpeaking && currentSpeakingId === messageId) {
        stopSpeaking()
        return
      }

      // Stop any current utterance
      window.speechSynthesis.cancel()

      // Clean text: strip markdown symbols, URLs, asterisks
      const cleanText = text
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // links
        .replace(/[*_#`~>]/g, '') // markdown formatting
        .replace(/\n+/g, '. ') // line breaks
        .trim()

      if (!cleanText) return

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.rate = speechRate
      utterance.pitch = 1.0

      if (selectedVoiceName) {
        const found = availableVoices.find((v) => v.name === selectedVoiceName)
        if (found) {
          utterance.voice = found
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        if (messageId) setCurrentSpeakingId(messageId)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        setCurrentSpeakingId(null)
      }

      utterance.onerror = (e) => {
        console.warn('[VoiceChat] Speech synthesis error:', e)
        setIsSpeaking(false)
        setCurrentSpeakingId(null)
      }

      window.speechSynthesis.speak(utterance)
    },
    [isSpeaking, currentSpeakingId, speechRate, selectedVoiceName, availableVoices]
  )

  // Stop Text-to-Speech
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setCurrentSpeakingId(null)
  }, [])

  // Toggle Auto-Speak mode
  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => {
      const next = !prev
      localStorage.setItem('sov_voice_autospeak', String(next))
      return next
    })
  }, [])

  // Change selected voice
  const handleSetVoice = useCallback((name: string) => {
    setSelectedVoiceName(name)
    localStorage.setItem('sov_voice_name', name)
  }, [])

  // Change speech rate
  const handleSetRate = useCallback((rate: number) => {
    setSpeechRate(rate)
    localStorage.setItem('sov_voice_rate', String(rate))
  }, [])

  return {
    // STT (Voice Input)
    isListening,
    recordingSeconds,
    speechError,
    startListening,
    stopListening,

    // TTS (Voice Output)
    isSpeaking,
    currentSpeakingId,
    availableVoices,
    selectedVoiceName,
    speechRate,
    autoSpeak,
    speakText,
    stopSpeaking,
    toggleAutoSpeak,
    setSelectedVoice: handleSetVoice,
    setSpeechRate: handleSetRate,
  }
}
