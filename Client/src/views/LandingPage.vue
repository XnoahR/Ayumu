<script setup>
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import { useAuthStore } from '../store/auth.js'
import { ref, onMounted } from 'vue'
import { useTheme } from '../composables/useTheme.js'
import Toast from '../components/Toast.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const authStore = useAuthStore()
const { isDark, toggleTheme } = useTheme()
const selectedLevel = ref(null)
const isLoading = ref(false)
const signingIn = ref(false)
const toast = ref(null)
const leaderboard = ref([])
const stats = ref(null)
const statsLoading = ref(true)
const lbLoading = ref(true)

const API_BASE = import.meta.env.VITE_API_URL || ''

const levels = [
  { code: 'N5', label: 'N5', desc: 'Basic' },
  { code: 'N4', label: 'N4', desc: 'Elementary' },
  { code: 'N3', label: 'N3', desc: 'Intermediate' },
  { code: 'N2', label: 'N2', desc: 'Upper-Intermediate' },
  { code: 'N1', label: 'N1', desc: 'Advanced' },
]

const showToast = (message, type = 'error') => {
  toast.value = { message, type, key: Date.now() }
}

const startSession = async () => {
  if (!selectedLevel.value) return
  isLoading.value = true
  try {
    const data = await sessionStore.createSession(selectedLevel.value, 'balanced_75')
    router.push({ name: 'exam', params: { sessionCode: data.session_code } })
  } catch (error) {
    showToast('Failed to start exam. Please try again.')
  } finally {
    isLoading.value = false
  }
}

const signOut = async () => {
  try {
    await authStore.signOut()
    stats.value = null
  } catch {
    showToast('Failed to sign out')
  }
}

onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      const authHeaders = {}
      if (authStore.accessToken) authHeaders['Authorization'] = `Bearer ${authStore.accessToken}`
      const res = await fetch(`${API_BASE}/api/profile`, { headers: authHeaders, credentials: 'include' })
      if (res.ok) stats.value = await res.json()
    } catch {}
  }
  statsLoading.value = false

  try {
    const res = await fetch(`${API_BASE}/api/leaderboard?limit=5`)
    if (res.ok) {
      const data = await res.json()
      leaderboard.value = data.entries
    }
  } catch {}
  lbLoading.value = false
})

const rankIcon = (name) => {
  const icons = { Beginner: '🌱', Apprentice: '📚', Scholar: '🎓', Master: '⭐', Sensei: '👑' }
  return icons[name] || '🌱'
}

const getTrophy = (rank) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <Toast v-if="toast" :key="toast.key" :message="toast.message" :type="toast.type" />

    <header class="h-12 flex items-center justify-between px-4 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 shrink-0">
      <div class="flex items-center gap-3 sm:gap-4">
        <span class="text-sm font-black text-gray-900 dark:text-white tracking-tight">AYUMU</span>
        <button @click="toggleTheme" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer" :title="isDark ? 'Light mode' : 'Dark mode'">
          <svg v-if="isDark" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
          </svg>
        </button>
        <router-link to="/leaderboard" class="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors hidden sm:block">
          Leaderboard
        </router-link>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <template v-if="authStore.isAuthenticated">
          <router-link to="/profile" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img v-if="authStore.discordAvatar" :src="authStore.discordAvatar" class="w-6 h-6 rounded-full" />
            <span class="text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[80px] sm:max-w-[140px] hidden sm:block">{{ authStore.discordUsername }}</span>
          </router-link>
          <button @click="signOut" class="text-[10px] font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
            Sign out
          </button>
        </template>
        <template v-else>
          <button @click="signingIn = true; authStore.signInWithDiscord().catch(() => signingIn = false)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded transition-colors"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
            </svg>
            <span class="hidden sm:inline">{{ signingIn ? 'Redirecting...' : 'Sign in' }}</span>
          </button>
        </template>
      </div>
    </header>

    <main class="flex-1 p-3 sm:p-6 max-w-4xl w-full mx-auto">
      <div class="mb-4 sm:mb-6">
        <h2 v-if="authStore.isAuthenticated" class="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
          Welcome back, {{ authStore.discordUsername }}
        </h2>
        <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">JLPT Practice Exam</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <!-- Start Exam Card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:col-span-2">
          <h3 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Start New Exam</h3>
          <div class="grid grid-cols-5 gap-2 mb-4">
            <button v-for="lvl in levels" :key="lvl.code"
              @click="selectedLevel = lvl.code"
              class="flex flex-col items-center justify-center py-3 sm:py-4 rounded-lg border-2 transition-all cursor-pointer"
              :class="selectedLevel === lvl.code
                ? 'border-gray-800 dark:border-gray-200 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'"
            >
              <span class="text-base sm:text-lg font-black">{{ lvl.label }}</span>
              <span class="text-[9px] font-medium opacity-60 hidden sm:block">{{ lvl.desc }}</span>
            </button>
          </div>
          <button @click="startSession" :disabled="!selectedLevel || isLoading"
            class="w-full py-3 sm:py-3.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs font-black uppercase tracking-widest rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <span v-if="isLoading">Starting...</span>
            <span v-else>Start {{ selectedLevel || 'Exam' }}</span>
          </button>
        </div>

        <!-- Stats Card (auth only) -->
        <div v-if="authStore.isAuthenticated && !statsLoading && stats" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
          <router-link to="/profile" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:text-gray-700 dark:hover:text-gray-300 mb-3 block">Your Stats →</router-link>
          <div v-if="stats" class="grid grid-cols-2 gap-3">
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p class="text-xl font-black text-gray-700 dark:text-gray-300">{{ stats.stats.total_exams || 0 }}</p>
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Exams</p>
            </div>
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p class="text-xl font-black text-gray-700 dark:text-gray-300">{{ stats.stats.current_streak || 0 }}</p>
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Streak</p>
            </div>
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p class="text-xl font-black text-gray-700 dark:text-gray-300">{{ stats.stats.avg_score || 0 }}%</p>
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Avg Score</p>
            </div>
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p class="text-xl font-black text-gray-700 dark:text-gray-300">{{ stats.stats.best_score || 0 }}</p>
              <p class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Best</p>
            </div>
          </div>
          <div v-if="stats.rank" class="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
            <span class="text-lg">{{ rankIcon(stats.rank.name) }}</span>
            <span>{{ stats.rank.name }} · {{ stats.stats.total_xp || 0 }} XP</span>
          </div>
        </div>

        <!-- Sign In Prompt (not auth) -->
        <div v-if="!authStore.isAuthenticated" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 flex flex-col items-center justify-center text-center">
          <svg class="w-8 h-8 text-[#5865F2] mb-3" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor"/>
          </svg>
          <p class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Sign in with Discord</p>
          <p class="text-[10px] text-gray-400 dark:text-gray-500 mb-4">Track your progress, earn achievements, and compete on the leaderboard</p>
          <button @click="signingIn = true; authStore.signInWithDiscord().catch(() => signingIn = false)"
            class="px-6 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-lg transition-colors"
          >
            {{ signingIn ? 'Redirecting...' : 'Sign in with Discord' }}
          </button>
        </div>

        <!-- Leaderboard Card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
          <router-link to="/leaderboard" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:text-gray-700 dark:hover:text-gray-300 mb-3 block">Leaderboard →</router-link>
          <div v-if="lbLoading" class="flex items-center justify-center py-4">
            <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
          <div v-else-if="leaderboard.length === 0" class="text-center py-4">
            <p class="text-xs text-gray-400 dark:text-gray-500">No data yet. Be the first!</p>
          </div>
          <div v-else class="space-y-1.5">
            <div v-for="entry in leaderboard" :key="entry.user_id"
              class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span class="w-5 h-5 flex items-center justify-center text-xs font-black shrink-0 text-gray-400 dark:text-gray-500">{{ getTrophy(entry.rank) || entry.rank }}</span>
              <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{{ entry.username }}</span>
              <span class="text-xs font-bold text-gray-500 dark:text-gray-400">{{ entry.total_score }} <span class="font-normal text-[10px]">pts</span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile nav links -->
      <div class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-center gap-6 sm:hidden">
        <router-link to="/leaderboard" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Leaderboard</router-link>
        <router-link to="/profile" class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Profile</router-link>
      </div>
    </main>
  </div>
</template>
