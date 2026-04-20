<script setup>
import { useRouter } from 'vue-router'
import { examStore } from '../store/exam.js'
import { onMounted } from 'vue'

const router = useRouter()

onMounted(() => {
  if (!examStore.currentSession) {
    router.push({ name: 'home' })
  }
})

const restart = () => {
  const session = examStore.currentSession
  examStore.reset()
  examStore.startSession(session)
  router.push({ name: 'exam', params: { sessionType: session } })
}

const goHome = () => {
  examStore.reset()
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-6 bg-primary-50 dark:bg-[#0a0a0c] text-primary-950 dark:text-primary-50">
    <div class="max-w-2xl w-full bg-white dark:bg-[#16161c] p-12 md:p-20 rounded-[3rem] text-center border-4 border-primary-100 dark:border-primary-900/30 shadow-2xl shadow-primary-200/40 dark:shadow-none">
      <div class="w-24 h-24 bg-primary-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-xl shadow-primary-600/40">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-4xl font-black mb-4 text-primary-950 dark:text-white">Simulation Ended</h2>
      <p class="text-primary-400 dark:text-primary-500/50 font-black mb-12 uppercase tracking-[0.4em] text-[10px]">Your performance scorecard</p>
      
      <div class="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 mb-16">
        <div class="text-center sm:text-left">
          <p class="text-7xl font-black text-primary-600 leading-none">{{ examStore.calculateScore }}</p>
          <p class="text-[10px] font-black text-primary-400 dark:text-primary-500/50 uppercase tracking-widest mt-3">Correct</p>
        </div>
        <div class="w-24 h-px sm:w-px sm:h-24 bg-primary-100 dark:bg-primary-900/50 rounded-full"></div>
        <div class="text-center sm:text-left">
          <p class="text-7xl font-black text-primary-950/20 dark:text-primary-50/20 leading-none">{{ examStore.activeQuestions.length }}</p>
          <p class="text-[10px] font-black text-primary-400 dark:text-primary-500/50 uppercase tracking-widest mt-3">Total</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button @click="restart" class="py-5 bg-primary-600 text-white text-xs tracking-widest font-black rounded-2xl shadow-xl shadow-primary-600/40 hover:scale-105 transition-transform">RESTART TEST</button>
        <button @click="goHome" class="py-5 bg-primary-50 dark:bg-[#202028] text-primary-900 dark:text-white text-xs tracking-widest font-black rounded-2xl hover:scale-105 transition-transform">MAIN MENU</button>
      </div>
    </div>
  </div>
</template>
