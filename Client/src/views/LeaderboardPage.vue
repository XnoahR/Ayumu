<script setup>
import { ref, onMounted } from 'vue'
import AppHeader from '../components/AppHeader.vue'

const entries = ref([])
const isLoading = ref(true)
const period = ref('alltime')
const level = ref(null)

const API_BASE = import.meta.env.VITE_API_URL || ''

const periods = [
  { value: 'alltime', label: 'Semua Waktu' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'weekly', label: 'Mingguan' },
]

const levels = [
  { value: null, label: 'Semua' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
]

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
  } catch {
    entries.value = []
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 ayumu-page text-gray-900 dark:text-gray-100">
    <AppHeader />

    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div class="mb-4 flex items-center justify-between gap-4">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Peringkat</p>
          <h1 class="mt-1 text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Papan Komunitas</h1>
        </div>
        <router-link
          to="/"
          class="ayumu-secondary-button px-4 py-2 rounded-full border border-gray-300 bg-white text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Kembali
        </router-link>
      </div>

      <div class="rounded-2xl border border-gray-200 ayumu-panel bg-white dark:bg-gray-800 p-4 sm:p-5">
        <div class="flex flex-col sm:flex-row gap-2 mb-5">
          <div class="flex gap-1 rounded-xl border border-gray-200 ayumu-note-surface bg-gray-50 p-1">
            <button
              v-for="p in periods"
              :key="p.value"
              @click="period = p.value; fetchLeaderboard()"
              class="px-3 py-1.5 text-xs font-black rounded-lg transition-colors"
              :class="period === p.value
                ? 'bg-gray-900 text-white ayumu-chip-active dark:bg-transparent'
                : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'"
            >
              {{ p.label }}
            </button>
          </div>
          <select
            v-model="level"
            @change="fetchLeaderboard()"
            class="ayumu-card-surface px-3 py-1.5 text-xs font-black rounded-xl bg-gray-50 border border-gray-200 text-gray-700 dark:text-gray-300"
          >
            <option v-for="l in levels" :key="l.label" :value="l.value">{{ l.label }}</option>
          </select>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <svg class="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>

        <div v-else-if="entries.length === 0" class="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
          Belum ada data peringkat.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="entry in entries"
            :key="entry.user_id"
            class="ayumu-card-surface flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
          >
            <span class="w-9 h-9 rounded-full bg-gray-900 text-white dark:bg-gray-800 dark:text-[#727ae9] dark:border dark:border-gray-700 flex items-center justify-center text-xs font-black shrink-0">
              {{ entry.rank }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ entry.username }}</p>
              <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{{ entry.total_exams }} ujian</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-black text-gray-800 dark:text-gray-100">{{ entry.total_score }} pts</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">terbaik {{ entry.best_score }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
