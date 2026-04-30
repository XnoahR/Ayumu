<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth.js'
import { useTheme } from '../composables/useTheme.js'

const router = useRouter()
const authStore = useAuthStore()
const { isDark, toggleTheme } = useTheme()
const entries = ref([])
const isLoading = ref(true)
const period = ref('alltime')
const level = ref(null)

const API_BASE = import.meta.env.VITE_API_URL || ''

onMounted(async () => {
  await fetchLeaderboard()
})

async function fetchLeaderboard() {
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('period', period.value)
    params.set('limit', '50')
    if (level.value) params.set('level', level.value)

    const response = await fetch(`${API_BASE}/api/leaderboard?${params}`)
    if (!response.ok) throw new Error('Failed to load')
    const data = await response.json()
    entries.value = data.entries
  } catch (err) {
    entries.value = []
  } finally {
    isLoading.value = false
  }
}

const periods = [
  { value: 'alltime', label: 'All-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
]

const levels = [
  { value: null, label: 'All' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
]

const getRankEmoji = (rank) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <header class="h-12 flex items-center justify-between px-4 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 shrink-0">
      <div class="flex items-center gap-4">
        <span class="text-sm font-black text-gray-900 dark:text-white tracking-tight">AYUMU</span>
        <button @click="toggleTheme" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer" :title="isDark ? 'Light mode' : 'Dark mode'">
          <svg v-if="isDark" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
          </svg>
        </button>
        <div class="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
        <span class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:block">Leaderboard</span>
      </div>
      <router-link to="/" class="text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
        ← Back
      </router-link>
    </header>

    <div class="flex-1 p-4 sm:p-6 max-w-2xl w-full mx-auto">
      <h2 class="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Leaderboard</h2>

      <div class="flex flex-col sm:flex-row gap-2 mb-6">
        <div class="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          <button v-for="p in periods" :key="p.value"
            @click="period = p.value; fetchLeaderboard()"
            class="px-3 py-1.5 text-xs font-bold rounded transition-colors"
            :class="period === p.value
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'"
          >
            {{ p.label }}
          </button>
        </div>
        <select v-model="level" @change="fetchLeaderboard()"
          class="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        >
          <option v-for="l in levels" :key="l.value" :value="l.value">{{ l.label }}</option>
        </select>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <svg class="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>

      <div v-else-if="entries.length === 0" class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-400 dark:text-gray-500">No data yet</p>
      </div>

      <div v-else class="space-y-2">
        <div v-for="entry in entries" :key="entry.user_id"
          class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <span class="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base font-black shrink-0 rounded-full"
            :class="entry.rank <= 3
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'"
          >
            {{ entry.rank }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ entry.username }}</p>
            <p class="text-[10px] text-gray-400 dark:text-gray-500">{{ entry.total_exams }} exams</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-black text-gray-700 dark:text-gray-300">{{ entry.total_score }} <span class="text-[10px] font-normal text-gray-400">pts</span></p>
            <p class="text-[10px] text-gray-400 dark:text-gray-500">best {{ entry.best_score }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
