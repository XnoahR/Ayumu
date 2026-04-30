<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const profile = ref(null)
const isLoading = ref(true)
const error = ref(null)

const API_BASE = import.meta.env.VITE_API_URL || ''

onMounted(async () => {
  try {
    const response = await fetch(`${API_BASE}/api/profile`, {
      credentials: 'include',
    })

    if (!response.ok) throw new Error('Failed to load profile')

    profile.value = await response.json()
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
})

const getRankIcon = (rank) => {
  const icons = {
    Beginner: '🌱',
    Apprentice: '📚',
    Scholar: '🎓',
    Master: '⭐',
    Sensei: '👑',
  }
  return icons[rank?.name] || '🌱'
}

const goHome = () => {
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-6 bg-primary-50 dark:bg-[#0a0a0c] text-primary-950 dark:text-primary-50">
    <div v-if="isLoading" class="flex items-center justify-center">
      <svg class="animate-spin h-12 w-12 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>

    <div v-else-if="error" class="max-w-md text-center">
      <p class="text-rose-500 mb-4">{{ error }}</p>
      <button @click="goHome" class="px-6 py-3 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest">
        Go Home
      </button>
    </div>

    <div v-else class="max-w-2xl w-full bg-white dark:bg-[#16161c] p-12 rounded-[3rem] border-4 border-primary-100 dark:border-primary-900/30 shadow-2xl shadow-primary-200/40 dark:shadow-none">
      <!-- Header -->
      <div class="text-center mb-10">
        <div class="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
          {{ getRankIcon(profile.rank) }}
        </div>
        <h2 class="text-3xl font-black text-primary-950 dark:text-white">{{ profile.user.display_name || profile.user.username }}</h2>
        <p class="text-sm font-bold text-primary-400 mt-1">{{ profile.rank.name }} • {{ profile.stats.total_xp || 0 }} XP</p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div class="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
          <p class="text-2xl font-black text-primary-600">{{ profile.stats.total_exams }}</p>
          <p class="text-[10px] font-bold text-primary-400 uppercase">Exams</p>
        </div>
        <div class="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
          <p class="text-2xl font-black text-primary-600">{{ profile.stats.best_score }}</p>
          <p class="text-[10px] font-bold text-primary-400 uppercase">Best Score</p>
        </div>
        <div class="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
          <p class="text-2xl font-black text-primary-600">{{ profile.stats.current_streak }}</p>
          <p class="text-[10px] font-bold text-primary-400 uppercase">Streak</p>
        </div>
        <div class="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
          <p class="text-2xl font-black text-primary-600">{{ profile.stats.avg_score }}%</p>
          <p class="text-[10px] font-bold text-primary-400 uppercase">Avg Score</p>
        </div>
      </div>

      <!-- Achievements -->
      <div v-if="profile.achievements.length > 0" class="mb-10">
        <h3 class="text-xs font-black text-primary-400 uppercase tracking-widest mb-4">Achievements</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="ach in profile.achievements" :key="ach.code" class="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <div class="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center text-lg">
              {{ getRankIcon({ name: ach.category }) }}
            </div>
            <div>
              <p class="text-sm font-bold text-primary-900 dark:text-white">{{ ach.name }}</p>
              <p class="text-[10px] text-primary-400">{{ ach.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Results -->
      <div v-if="profile.recent_results.length > 0" class="mb-10">
        <h3 class="text-xs font-black text-primary-400 uppercase tracking-widest mb-4">Recent Results</h3>
        <div class="space-y-2">
          <div v-for="result in profile.recent_results" :key="result.id" class="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <div>
              <p class="text-sm font-bold text-primary-900 dark:text-white">{{ result.level }} Exam</p>
              <p class="text-[10px] text-primary-400">{{ new Date(result.completed_at).toLocaleDateString() }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-primary-600">{{ result.score }}/{{ result.total_questions }}</p>
              <p class="text-[10px] text-primary-400">{{ result.percentage }}%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-4">
        <button @click="goHome" class="flex-1 py-4 bg-primary-600 text-white text-xs tracking-widest font-black rounded-xl shadow-xl shadow-primary-600/40 hover:scale-105 transition-transform">
          START EXAM
        </button>
      </div>
    </div>
  </div>
</template>
