<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { examStore } from '../store/exam.js'
import QuestionArea from '../components/QuestionArea.vue'
import QuestionMap from '../components/QuestionMap.vue'

const router = useRouter()

const props = defineProps({
  sessionType: String
})

onMounted(() => {
  if (!examStore.currentSession) {
    examStore.startSession('full_exam')
  }
})

const submitExam = () => {
  if (confirm('Are you sure you want to finish the exam?')) {
    router.push({ name: 'results' })
  }
}

const quitSession = () => {
  if (confirm('Exit exam? Progress will not be saved.')) {
    examStore.reset()
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
        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400">N5 Simulation</span>
      </div>
      
      <div class="flex items-center gap-4">
        <!-- Size Toggle -->
        <button @click="examStore.toggleUiSize()" class="hidden md:flex items-center justify-center p-2 rounded-xl text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all border border-transparent hover:border-primary-200 dark:hover:border-primary-800" title="Toggle UI Size">
          <svg v-if="examStore.uiSize === 'medium'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14L21 3m0 0h-6m6 0v6M14 10l-3 3m-7 7l11-11M3 21h6m-6 0v-6" />
          </svg>
        </button>

        <button @click="quitSession" class="text-[10px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-4 py-2 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900">
          EXIT
        </button>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden flex-col md:flex-row">
      <!-- Left: Question Area -->
      <main class="flex-1 overflow-y-auto p-4 md:p-8">
        <div class="h-full flex flex-col justify-between mx-auto w-full transition-all duration-300" :class="examStore.uiSize === 'small' ? 'max-w-3xl' : 'max-w-[90%] xl:max-w-5xl'">
          
          <QuestionArea 
            v-if="examStore.currentQuestion" 
            :question="examStore.currentQuestion" 
            :index="examStore.currentIndex" 
            :uiSize="examStore.uiSize"
          />

          <!-- Controls -->
          <div class="flex items-center justify-between mt-8 w-full px-2">
            <button @click="examStore.prevQuestion()" :disabled="examStore.currentIndex === 0"
              class="px-8 py-3 font-black rounded-xl text-xs tracking-widest text-primary-600 dark:text-primary-400 disabled:opacity-20 hover:bg-white dark:hover:bg-primary-900/20 transition-all border-2 border-transparent hover:border-primary-200 dark:hover:border-primary-800">
              PREVIOUS
            </button>
            <div class="flex gap-4">
              <button v-if="examStore.currentIndex < examStore.activeQuestions.length - 1" @click="examStore.nextQuestion()"
                class="px-10 py-3 bg-primary-600 hover:bg-primary-700 text-white text-xs tracking-widest font-black rounded-xl shadow-lg shadow-primary-600/30 transition-transform active:scale-95">
                NEXT
              </button>
              <button v-else @click="submitExam"
                class="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs tracking-widest font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-transform active:scale-95">
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      </main>

      <!-- Right: Sidebar -->
      <aside class="w-full md:w-80 lg:w-96 bg-white dark:bg-[#121216] border-t md:border-t-0 md:border-l border-primary-100 dark:border-primary-900/50 p-6 md:p-8 flex flex-col shrink-0 overflow-y-auto max-h-64 md:max-h-full transition-colors duration-300">
        <QuestionMap :totalQuestions="examStore.activeQuestions.length" @submit="submitExam" />
      </aside>
    </div>
  </div>
</template>
