import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useSessionStore = defineStore('session', () => {
  // State
  const sessionCode = ref(null)
  const session = ref(null)
  const questions = ref([])
  const currentIndex = ref(0)
  const userAnswers = ref({})
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const submitResult = ref(null)

  // Computed
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

  // Actions
  async function createSession(level = 'N5', templateId = 'balanced_75') {
    isLoading.value = true
    try {
      const response = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ level, template_id: templateId }),
      })

      if (!response.ok) throw new Error('Failed to create session')

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
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Session not found')

      const data = await response.json()
      sessionCode.value = code
      session.value = data.session
      questions.value = data.questions
      userAnswers.value = data.session.user_answers || {}
      currentIndex.value = 0

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
      await fetch(`${API_BASE}/api/sessions/${sessionCode.value}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          question_index: questionIndex,
          selected_option: selectedOption,
        }),
      })
    } catch (error) {
      console.error('Save answer error:', error)
    }
  }

  async function submitSession() {
    isSubmitting.value = true
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionCode.value}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_answers: userAnswers.value }),
      })

      if (!response.ok) throw new Error('Failed to submit')

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

  function reset() {
    sessionCode.value = null
    session.value = null
    questions.value = []
    currentIndex.value = 0
    userAnswers.value = {}
    submitResult.value = null
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
    currentQuestion,
    totalQuestions,
    answeredCount,
    progress,
    createSession,
    loadSession,
    saveAnswer,
    submitSession,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    reset,
  }
})
