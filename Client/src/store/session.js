import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useSessionStore = defineStore('session', () => {
  function headers() {
    const h = { 'Content-Type': 'application/json' }
    const token = useAuthStore().accessToken
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  const sessionCode = ref(null)
  const session = ref(null)
  const questions = ref([])
  const currentIndex = ref(0)
  const userAnswers = ref({})
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const submitResult = ref(null)
  const flaggedQuestions = ref(new Set())
  const exerciseMap = ref({})
  const error = ref(null)

  const currentQuestion = computed(() => {
    if (!questions.value.length) return null
    return questions.value[currentIndex.value]
  })

  const totalQuestions = computed(() => questions.value.length)

  const answeredCount = computed(() => Object.keys(userAnswers.value).length)

  const progress = computed(() => {
    if (!totalQuestions.value) return 0
    return Math.round((answeredCount.value / totalQuestions.value) * 100)
  })

  const flaggedCount = computed(() => flaggedQuestions.value.size)

  const sectionBreakdown = computed(() => {
    const breakdown = {}
    const flaggedArr = [...flaggedQuestions.value]
    questions.value.forEach((q, idx) => {
      let section = (q.section || 'unknown').toLowerCase()
      if (section === 'vocabulary' || section === 'vocab' || section === 'kanji') {
        section = 'grammar'
      }
      if (!breakdown[section]) {
        breakdown[section] = { total: 0, answered: 0, flagged: 0, indices: [] }
      }
      breakdown[section].total++
      breakdown[section].indices.push(idx)
      if (userAnswers.value[idx] !== undefined) breakdown[section].answered++
      if (flaggedArr.includes(idx)) breakdown[section].flagged++
    })
    return breakdown
  })

  async function createSession(level = 'N5', templateId = 'balanced_75') {
    isLoading.value = true
    try {
      const response = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: headers(),
        credentials: 'include',
        body: JSON.stringify({ level, template_id: templateId }),
      })

      if (!response.ok) throw new Error('Gagal membuat sesi')

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Create session error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function loadSession(code) {
    isLoading.value = true
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${code}`, {
        headers: headers(),
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Sesi tidak ditemukan')

      const data = await response.json()
      sessionCode.value = code
      session.value = data.session
      questions.value = data.questions
      userAnswers.value = data.session.user_answers || {}
      currentIndex.value = 0
      flaggedQuestions.value = new Set()

      const map = {}
      data.questions.forEach((q, idx) => {
        map[idx] = q.section || 'unknown'
      })
      exerciseMap.value = map

      return data
    } catch (error) {
      console.error('Load session error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function saveAnswer(questionIndex, selectedOption) {
    userAnswers.value[questionIndex] = selectedOption

    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionCode.value}/answer`, {
        method: 'POST',
        headers: headers(),
        credentials: 'include',
        body: JSON.stringify({
          question_index: questionIndex,
          selected_option: selectedOption,
        }),
      })
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gagal menyimpan jawaban: ${response.status} ${errText}`)
      }
    } catch (err) {
      error.value = err.message || 'Gagal menyimpan jawaban'
      console.error('Save answer error:', err)
    }
  }

  async function submitSession() {
    isSubmitting.value = true
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionCode.value}/submit`, {
        method: 'POST',
        headers: headers(),
        credentials: 'include',
        body: JSON.stringify({ user_answers: userAnswers.value }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gagal mengirim: ${response.status} ${errText}`)
      }

      const data = await response.json()
      submitResult.value = data
      return data
    } catch (error) {
      console.error('Submit error:', error)
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  function nextQuestion() {
    if (currentIndex.value < totalQuestions.value - 1) {
      currentIndex.value++
    }
  }

  function prevQuestion() {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  function goToQuestion(index) {
    currentIndex.value = index
  }

  function toggleFlag(index) {
    const newSet = new Set(flaggedQuestions.value)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    flaggedQuestions.value = newSet
  }

  function isFlagged(index) {
    return flaggedQuestions.value.has(index)
  }

  function reset() {
    sessionCode.value = null
    session.value = null
    questions.value = []
    currentIndex.value = 0
    userAnswers.value = {}
    submitResult.value = null
    flaggedQuestions.value = new Set()
    exerciseMap.value = {}
    error.value = null
  }

  function clearError() {
    error.value = null
  }

  return {
    sessionCode,
    session,
    questions,
    currentIndex,
    userAnswers,
    isLoading,
    isSubmitting,
    submitResult,
    flaggedQuestions,
    exerciseMap,
    currentQuestion,
    totalQuestions,
    answeredCount,
    progress,
    flaggedCount,
    sectionBreakdown,
    createSession,
    loadSession,
    saveAnswer,
    submitSession,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    toggleFlag,
    isFlagged,
    reset,
    error,
    clearError,
  }
})
