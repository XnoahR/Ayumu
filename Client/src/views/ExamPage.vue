<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import QuestionArea from '../components/QuestionArea.vue'
import QuestionMap from '../components/QuestionMap.vue'
import Toast from '../components/Toast.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const isSubmitting = ref(false)
const toast = ref(null)
const timerSeconds = ref(0)
let timerInterval = null

const confirmDialog = ref({
  show: false,
  message: '',
  resolve: null,
})

function showConfirm(message) {
  return new Promise((resolve) => {
    confirmDialog.value = { show: true, message, resolve }
  })
}

watch(() => sessionStore.error, (err) => {
  if (err) {
    showToast(err)
    sessionStore.clearError()
  }
})

const props = defineProps({
  sessionCode: String
})

const showToast = (message, type = 'error') => {
  toast.value = { message, type, key: Date.now() }
}

const formattedTime = computed(() => {
  const mins = Math.floor(timerSeconds.value / 60)
  const secs = timerSeconds.value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

function startTimer() {
  if (timerInterval) return
  timerInterval = setInterval(() => {
    timerSeconds.value++
    sessionStorage.setItem('ayumu_timer', String(timerSeconds.value))
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function loadTimer() {
  const saved = sessionStorage.getItem('ayumu_timer')
  if (saved) {
    timerSeconds.value = parseInt(saved, 10) || 0
  }
}

function clearTimer() {
  sessionStorage.removeItem('ayumu_timer')
}

onMounted(async () => {
  if (!props.sessionCode) {
    showToast('No session code provided')
    router.push({ name: 'home' })
    return
  }

  loadTimer()

  try {
    await sessionStore.loadSession(props.sessionCode)
    startTimer()
  } catch (error) {
    showToast('Session not found or expired')
    router.push({ name: 'home' })
  }
})

onUnmounted(() => {
  stopTimer()
})

const submitExam = async () => {
  const unanswered = sessionStore.totalQuestions - sessionStore.answeredCount
  let msg = 'Are you sure you want to finish the assessment?'
  if (unanswered > 0) {
    msg = `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Are you sure you want to finish?`
  }
  if (!(await showConfirm(msg))) return

  isSubmitting.value = true
  try {
    await sessionStore.submitSession()
    stopTimer()
    clearTimer()
    router.push({ name: 'results', params: { sessionCode: props.sessionCode } })
  } catch (error) {
    showToast('Failed to submit assessment: ' + error.message)
    console.error('Submit error:', error)
  } finally {
    isSubmitting.value = false
  }
}

const quitSession = async () => {
  if (!(await showConfirm('Exit assessment? Progress will not be saved.'))) return
  stopTimer()
  clearTimer()
  sessionStore.reset()
  router.push({ name: 'home' })
}

const examTitle = computed(() => {
  const level = sessionStore.session?.level || 'N5'
  return `${level} Balanced 75 Paket 1`
})

const currentSectionLabel = computed(() => {
  const q = sessionStore.currentQuestion
  if (!q) return 'ASSESSMENT'
  let section = (q.section || '').toLowerCase()
  if (section === 'vocabulary' || section === 'vocab' || section === 'kanji') section = 'grammar'
  const map = {
    grammar: 'LANGUAGE KNOWLEDGE ASSESSMENT',
    reading: 'READING ASSESSMENT',
    listening: 'LISTENING ASSESSMENT',
  }
  return map[section] || 'ASSESSMENT'
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <Toast v-if="toast" :key="toast.key" :message="toast.message" :type="toast.type" />

    <header class="h-12 flex items-center justify-between px-4 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 shrink-0 z-10">
      <div class="flex items-center gap-4">
        <span class="text-sm font-black text-gray-900 dark:text-white tracking-tight">AYUMU</span>
        <div class="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ currentSectionLabel }}</span>
        <span class="text-xs font-medium text-gray-400 dark:text-gray-500">{{ examTitle }}</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {{ formattedTime }}
        </span>
        <button @click.stop="quitSession" class="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded border border-red-200 dark:border-red-800 transition-colors cursor-pointer">
          EXIT SIMULATION
        </button>
      </div>
    </header>

    <div class="h-10 flex items-center px-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div>
        <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active Assessment</p>
        <p class="text-xs font-bold text-gray-700 dark:text-gray-300">{{ examTitle }}</p>
      </div>
    </div>

    <div v-if="sessionStore.isLoading" class="flex-1 flex items-center justify-center">
      <svg class="animate-spin h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>

    <div v-else-if="sessionStore.totalQuestions > 0" class="flex flex-1 overflow-hidden">
      <main class="flex-1 overflow-y-auto p-4">
        <QuestionArea
          v-if="sessionStore.currentQuestion"
          :question="sessionStore.currentQuestion"
          :index="sessionStore.currentIndex"
        />

        <div class="flex items-center justify-between mt-4">
          <button @click.stop="sessionStore.prevQuestion()" :disabled="sessionStore.currentIndex === 0"
            class="px-6 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Previous
          </button>
          <div class="flex gap-3">
            <button v-if="sessionStore.currentIndex < sessionStore.totalQuestions - 1" @click.stop="sessionStore.nextQuestion()"
              class="px-8 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs font-bold rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Next
            </button>
            <button v-else @click.stop="submitExam" :disabled="isSubmitting"
              class="px-8 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs font-bold rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {{ isSubmitting ? 'Submitting...' : 'Finish' }}
            </button>
          </div>
        </div>
      </main>

      <aside class="w-72 lg:w-80 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 p-4 flex flex-col shrink-0 overflow-y-auto">
        <QuestionMap @submit="submitExam" />
      </aside>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">No questions loaded</p>
        <button @click="router.push({ name: 'home' })" class="mt-3 px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
          Return Home
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="confirmDialog.show" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50 dark:bg-black/70" @click="confirmDialog.resolve(false); confirmDialog.show = false"></div>
        <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full mx-4">
          <p class="text-sm text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">{{ confirmDialog.message }}</p>
          <div class="flex justify-end gap-3">
            <button @click="confirmDialog.resolve(false); confirmDialog.show = false"
              class="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
              Cancel
            </button>
            <button @click="confirmDialog.resolve(true); confirmDialog.show = false"
              class="px-4 py-2 text-xs font-bold text-white bg-gray-800 dark:bg-gray-200 dark:text-gray-900 rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors cursor-pointer">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
