<script setup>
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import { computed, onMounted, ref } from 'vue'
import Toast from '../components/Toast.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const toast = ref(null)
const isRefetching = ref(false)

const showToast = (message, type = 'error') => {
  toast.value = { message, type, key: Date.now() }
}

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

onMounted(async () => {
  if (!sessionStore.submitResult && sessionStore.sessionCode) {
    isRefetching.value = true
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/sessions/${sessionStore.sessionCode}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.session?.status === 'completed') {
          sessionStore.submitResult = {
            score: data.session.score,
            total: data.questions?.length || 0,
            percentage: Math.round((data.session.score / (data.questions?.length || 1)) * 100),
            time_spent_seconds: data.session.time_spent_seconds || 0,
            new_achievements: [],
          }
        }
      }
    } catch (e) {
      console.error('Refetch error:', e)
    } finally {
      isRefetching.value = false
    }
  }

  if (!sessionStore.submitResult && !sessionStore.sessionCode) {
    showToast('No results to display')
    router.push({ name: 'home' })
  }
})

const restart = async () => {
  sessionStore.reset()
  try {
    const data = await sessionStore.createSession('N5', 'balanced_75')
    router.push({ name: 'exam', params: { sessionCode: data.session_code } })
  } catch (error) {
    showToast('Failed to start new exam')
  }
}

const goHome = () => {
  sessionStore.reset()
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <Toast v-if="toast" :key="toast.key" :message="toast.message" :type="toast.type" />

    <div v-if="isRefetching" class="flex items-center justify-center">
      <svg class="animate-spin h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>

    <div v-else class="max-w-2xl w-full bg-white dark:bg-gray-800 p-12 md:p-16 rounded-2xl text-center border border-gray-200 dark:border-gray-700 shadow-sm">
      <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-2xl font-black mb-2 text-gray-900 dark:text-white">Assessment Ended</h2>
      <p class="text-gray-400 dark:text-gray-500 font-bold mb-10 uppercase tracking-[0.3em] text-[10px]">Your performance scorecard</p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 mb-8">
        <div class="text-center">
          <p class="text-6xl font-black text-gray-900 dark:text-white leading-none">{{ score }}</p>
          <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Correct</p>
        </div>
        <div class="w-20 h-px sm:w-px sm:h-16 bg-gray-200 dark:bg-gray-700"></div>
        <div class="text-center">
          <p class="text-6xl font-black text-gray-300 dark:text-gray-600 leading-none">{{ total }}</p>
          <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Total</p>
        </div>
      </div>

      <div class="flex items-center justify-center gap-6 mb-8">
        <div class="text-center">
          <p class="text-2xl font-black text-gray-700 dark:text-gray-300">{{ percentage }}%</p>
          <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Accuracy</p>
        </div>
        <div class="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
        <div class="text-center">
          <p class="text-2xl font-black text-gray-700 dark:text-gray-300">{{ formatTime(timeSpent) }}</p>
          <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Time</p>
        </div>
      </div>

      <div v-if="newAchievements.length > 0" class="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">New Achievements Unlocked!</p>
        <div class="flex flex-wrap gap-2 justify-center">
          <span v-for="ach in newAchievements" :key="ach.code" class="px-3 py-1 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded text-xs font-bold">
            {{ ach.name }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button @click="restart" class="py-4 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs tracking-widest font-black rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors">RESTART TEST</button>
        <button @click="goHome" class="py-4 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs tracking-widest font-black rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">MAIN MENU</button>
      </div>
    </div>
  </div>
</template>
