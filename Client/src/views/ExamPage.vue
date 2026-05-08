<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import { useTheme } from '../composables/useTheme.js'
import QuestionArea from '../components/QuestionArea.vue'
import QuestionMap from '../components/QuestionMap.vue'
import Toast from '../components/Toast.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const { isDark, toggleTheme } = useTheme()
const isSubmitting = ref(false)
const toast = ref(null)
const timerSeconds = ref(0)
const showMapOverlay = ref(false)
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
    showToast('Kode sesi tidak ditemukan')
    router.push({ name: 'home' })
    return
  }

  loadTimer()

  try {
    await sessionStore.loadSession(props.sessionCode)
    startTimer()
  } catch (error) {
    showToast('Sesi tidak ditemukan atau sudah kedaluwarsa')
    router.push({ name: 'home' })
  }
})

onUnmounted(() => {
  stopTimer()
})

const submitExam = async () => {
  const unanswered = sessionStore.totalQuestions - sessionStore.answeredCount
  let msg = 'Yakin ingin menyelesaikan ujian ini?'
  if (unanswered > 0) {
    msg = `Masih ada ${unanswered} soal yang belum dijawab. Yakin ingin menyelesaikannya?`
  }
  if (!(await showConfirm(msg))) return

  isSubmitting.value = true
  try {
    await sessionStore.submitSession()
    stopTimer()
    clearTimer()
    router.push({ name: 'results', params: { sessionCode: props.sessionCode } })
  } catch (error) {
    showToast('Gagal mengirim hasil ujian: ' + error.message)
    console.error('Submit error:', error)
  } finally {
    isSubmitting.value = false
  }
}

const quitSession = async () => {
  if (!(await showConfirm('Keluar dari ujian? Progres tidak akan disimpan.'))) return
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
  if (!q) return 'UJIAN'
  let section = (q.section || '').toLowerCase()
  if (section === 'vocabulary' || section === 'vocab' || section === 'kanji') section = 'grammar'
  const map = {
    grammar: 'UJIAN PENGETAHUAN BAHASA',
    reading: 'UJIAN MEMBACA',
    listening: 'UJIAN MENYIMAK',
  }
  return map[section] || 'UJIAN'
})

const questionProgress = computed(() => {
  return `${sessionStore.answeredCount}/${sessionStore.totalQuestions}`
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <Toast v-if="toast" :key="toast.key" :message="toast.message" :type="toast.type" />

    <header class="h-12 flex items-center justify-between px-3 sm:px-4 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 shrink-0 z-20">
      <div class="flex items-center gap-2 sm:gap-4">
        <span class="text-sm font-black text-gray-900 dark:text-white tracking-tight">AYUMU.</span>
        <button @click="toggleTheme" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer" :title="isDark ? 'Mode terang' : 'Mode gelap'">
          <svg v-if="isDark" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
          </svg>
        </button>
        <div class="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:block">{{ currentSectionLabel }}</span>
        <span class="text-xs font-medium text-gray-400 dark:text-gray-500 hidden lg:block">{{ examTitle }}</span>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <button @click="showMapOverlay = true" class="sm:hidden flex items-center gap-1 px-2 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {{ questionProgress }}
        </button>
        <span class="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {{ formattedTime }}
        </span>
        <button @click="quitSession" class="text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded border border-red-200 dark:border-red-800 transition-colors cursor-pointer">
          KELUAR
        </button>
      </div>
    </header>

    <div class="h-10 hidden sm:flex items-center px-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div>
        <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ujian Aktif</p>
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
      <main class="flex-1 overflow-y-auto p-3 sm:p-4">
        <QuestionArea
          v-if="sessionStore.currentQuestion"
          :question="sessionStore.currentQuestion"
          :index="sessionStore.currentIndex"
        />

        <div class="flex items-center justify-between mt-4 gap-2">
          <button @click="sessionStore.prevQuestion()" :disabled="sessionStore.currentIndex === 0"
            class="px-4 sm:px-6 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Sebelumnya
          </button>
          <div class="flex gap-2 sm:gap-3">
            <button v-if="sessionStore.currentIndex < sessionStore.totalQuestions - 1" @click="sessionStore.nextQuestion()"
              class="px-6 sm:px-8 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs font-bold rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Berikutnya
            </button>
            <button v-else @click="submitExam" :disabled="isSubmitting"
              class="px-6 sm:px-8 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs font-bold rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {{ isSubmitting ? 'Mengirim...' : 'Selesai' }}
            </button>
          </div>
        </div>
      </main>

      <!-- Desktop sidebar -->
      <aside class="hidden sm:block w-72 lg:w-80 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 p-4 flex flex-col shrink-0 overflow-y-auto">
        <QuestionMap @submit="submitExam" />
      </aside>

      <!-- Mobile map overlay -->
      <Teleport to="body">
        <div v-if="showMapOverlay" class="fixed inset-0 z-50 sm:hidden">
          <div class="absolute inset-0 bg-black/50" @click="showMapOverlay = false"></div>
          <div class="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-800 p-4 flex flex-col overflow-y-auto shadow-xl">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Navigasi</h3>
              <button @click="showMapOverlay = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <QuestionMap @submit="submitExam; showMapOverlay = false" />
          </div>
        </div>
      </Teleport>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">Soal belum dimuat</p>
        <button @click="router.push({ name: 'home' })" class="mt-3 px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
          Kembali ke Beranda
        </button>
      </div>
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
            Batal
          </button>
          <button @click="confirmDialog.resolve(true); confirmDialog.show = false"
            class="px-4 py-2 text-xs font-bold text-white bg-gray-800 dark:bg-gray-200 dark:text-gray-900 rounded hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors cursor-pointer">
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
