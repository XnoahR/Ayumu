<script setup>
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import { computed } from 'vue'

const router = useRouter()
const sessionStore = useSessionStore()

const score = computed(() => sessionStore.submitResult?.score || 0)
const total = computed(() => sessionStore.submitResult?.total || 0)
const percentage = computed(() => sessionStore.submitResult?.percentage || 0)
const timeSpent = computed(() => sessionStore.submitResult?.time_spent_seconds || 0)
const newAchievements = computed(() => sessionStore.submitResult?.new_achievements || [])

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

const restart = async () => {
  sessionStore.reset()
  try {
    const data = await sessionStore.createSession('N5', 'balanced_75')
    router.push({ name: 'exam', params: { sessionCode: data.session_code } })
  } catch (error) {
    alert('Failed to start new exam')
  }
}

const goHome = () => {
  sessionStore.reset()
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
      
      <div class="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 mb-8">
        <div class="text-center sm:text-left">
          <p class="text-7xl font-black text-primary-600 leading-none">{{ score }}</p>
          <p class="text-[10px] font-black text-primary-400 dark:text-primary-500/50 uppercase tracking-widest mt-3">Correct</p>
        </div>
        <div class="w-24 h-px sm:w-px sm:h-24 bg-primary-100 dark:bg-primary-900/50 rounded-full"></div>
        <div class="text-center sm:text-left">
          <p class="text-7xl font-black text-primary-950/20 dark:text-primary-50/20 leading-none">{{ total }}</p>
          <p class="text-[10px] font-black text-primary-400 dark:text-primary-500/50 uppercase tracking-widest mt-3">Total</p>
        </div>
      </div>

      <div class="flex items-center justify-center gap-6 mb-8">
        <div class="text-center">
          <p class="text-3xl font-black text-primary-600">{{ percentage }}%</p>
          <p class="text-[10px] font-black text-primary-400 dark:text-primary-500/50 uppercase tracking-widest">Accuracy</p>
        </div>
        <div class="w-px h-12 bg-primary-100 dark:bg-primary-900/50"></div>
        <div class="text-center">
          <p class="text-3xl font-black text-primary-600">{{ formatTime(timeSpent) }}</p>
          <p class="text-[10px] font-black text-primary-400 dark:text-primary-500/50 uppercase tracking-widest">Time</p>
        </div>
      </div>

      <div v-if="newAchievements.length > 0" class="mb-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
        <p class="text-xs font-black text-primary-400 uppercase tracking-widest mb-2">New Achievements Unlocked!</p>
        <div class="flex flex-wrap gap-2 justify-center">
          <span v-for="ach in newAchievements" :key="ach.code" class="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs font-bold">
            {{ ach.name }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button @click="restart" class="py-5 bg-primary-600 text-white text-xs tracking-widest font-black rounded-2xl shadow-xl shadow-primary-600/40 hover:scale-105 transition-transform">RESTART TEST</button>
        <button @click="goHome" class="py-5 bg-primary-50 dark:bg-[#202028] text-primary-900 dark:text-white text-xs tracking-widest font-black rounded-2xl hover:scale-105 transition-transform">MAIN MENU</button>
      </div>
    </div>
  </div>
</template>
