<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import QuestionArea from '../components/QuestionArea.vue'
import QuestionMap from '../components/QuestionMap.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const isSubmitting = ref(false)

const props = defineProps({
  sessionCode: String
})

onMounted(async () => {
  if (!props.sessionCode) {
    router.push({ name: 'home' })
    return
  }

  try {
    await sessionStore.loadSession(props.sessionCode)
  } catch (error) {
    alert('Session not found or expired')
    router.push({ name: 'home' })
  }
})

const submitExam = async () => {
  if (!confirm('Are you sure you want to finish the exam?')) return

  isSubmitting.value = true
  try {
    await sessionStore.submitSession()
    router.push({ name: 'results', params: { sessionCode: props.sessionCode } })
  } catch (error) {
    alert('Failed to submit exam')
  } finally {
    isSubmitting.value = false
  }
}

const quitSession = () => {
  if (confirm('Exit exam? Progress will not be saved.')) {
    sessionStore.reset()
    router.push({ name: 'home' })
  }
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-primary-50/50 dark:bg-[#0a0a0c] text-primary-950 dark:text-primary-50 transition-colors duration-300">
    <!-- Header -->
    <header class="h-16 flex items-center justify-between px-8 bg-white dark:bg-[#121216] border-b border-primary-100 dark:border-primary-900/50 shrink-0 transition-colors duration-300">
      <div class="flex items-center gap-6">
        <span class="text-xl font-black text-primary-600 tracking-tighter italic">AYUMU.</span>
        <div class="h-6 w-px bg-primary-200 dark:bg-primary-800 transition-colors duration-300"></div>
        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400">{{ sessionStore.session?.level || 'N5' }} Simulation</span>
      </div>
      
      <div class="flex items-center gap-4">
        <button @click="quitSession" class="text-[10px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900">
          EXIT
        </button>
      </div>
    </header>

    <div v-if="sessionStore.isLoading" class="flex-1 flex items-center justify-center">
      <svg class="animate-spin h-12 w-12 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>

    <div v-else class="flex flex-1 overflow-hidden flex-col md:flex-row">
      <!-- Left: Question Area -->
      <main class="flex-1 overflow-y-auto p-4 md:p-8">
        <div class="h-full flex flex-col justify-between mx-auto w-full">
          
          <QuestionArea 
            v-if="sessionStore.currentQuestion" 
            :question="sessionStore.currentQuestion" 
            :index="sessionStore.currentIndex"
          />

          <!-- Controls -->
          <div class="flex items-center justify-between mt-8 w-full px-2">
            <button @click="sessionStore.prevQuestion()" :disabled="sessionStore.currentIndex === 0"
              class="px-8 py-3 font-black rounded-xl text-xs tracking-widest text-primary-600 dark:text-primary-400 disabled:opacity-20 hover:bg-white dark:hover:bg-primary-900/20 transition-all border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-800">
              PREVIOUS
            </button>
            <div class="flex gap-4">
              <button v-if="sessionStore.currentIndex < sessionStore.totalQuestions - 1" @click="sessionStore.nextQuestion()"
                class="px-10 py-3 bg-primary-600 hover:bg-primary-700 text-white text-xs tracking-widest font-black rounded-xl shadow-lg shadow-primary-600/30 transition-transform active:scale-95">
                NEXT
              </button>
              <button v-else @click="submitExam" :disabled="isSubmitting"
                class="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs tracking-widest font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 disabled:opacity-50">
                {{ isSubmitting ? 'Submitting...' : 'SUBMIT' }}
              </button>
            </div>
          </div>
        </div>
      </main>

      <!-- Right: Sidebar -->
      <aside class="w-full md:w-80 lg:w-96 bg-white dark:bg-[#121216] border-t md:border-t-0 md:border-l border-primary-100 dark:border-primary-900/50 p-6 md:p-8 flex flex-col shrink-0 overflow-y-auto max-h-64 md:max-h-full transition-colors duration-300">
        <QuestionMap :totalQuestions="sessionStore.totalQuestions" @submit="submitExam" />
      </aside>
    </div>
  </div>
</template>
