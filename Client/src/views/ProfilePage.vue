<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth.js'
import AppHeader from '../components/AppHeader.vue'
import Toast from '../components/Toast.vue'

const router = useRouter()
const authStore = useAuthStore()
const profile = ref(null)
const isLoading = ref(true)
const error = ref(null)
const toast = ref(null)
const signingIn = ref(false)
const isClaiming = ref(false)

const API_BASE = import.meta.env.VITE_API_URL || ''

const createFallbackProfile = () => ({
  user: {
    display_name: 'Ayumu Lokal',
    username: 'Ayumu Lokal',
    is_anonymous: true,
  },
  rank: {
    name: 'Bridge',
  },
  stats: {
    total_exams: 0,
    best_score: 0,
    current_streak: 0,
    avg_score: 0,
    total_xp: 0,
  },
  achievements: [],
  recent_results: [],
})

const showToast = (message, type = 'error') => {
  toast.value = { message, type, key: Date.now() }
}

async function claimProgress() {
  isClaiming.value = true
  try {
    const response = await fetch(`${API_BASE}/api/sessions/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authStore.accessToken ? { Authorization: `Bearer ${authStore.accessToken}` } : {}),
      },
      credentials: 'include',
    })
    if (response.ok) {
      showToast('Progres berhasil diklaim. Muat ulang untuk melihat statistik terbaru.', 'success')
    } else {
      const err = await response.json()
      showToast(err.message || 'Gagal mengklaim progres')
    }
  } catch (err) {
    showToast('Gagal mengklaim progres')
  } finally {
    isClaiming.value = false
  }
}

onMounted(async () => {
  try {
    const authHeaders = {}
    if (authStore.accessToken) {
      authHeaders['Authorization'] = `Bearer ${authStore.accessToken}`
    }
    const response = await fetch(`${API_BASE}/api/profile`, {
      headers: authHeaders,
      credentials: 'include',
    })

    if (!response.ok) throw new Error('Failed to load profile')

    profile.value = await response.json()
  } catch (err) {
    error.value = 'Gagal memuat profil Ayumu langsung. Bridge Desktop Anki masih bisa dipakai di bawah.'
    profile.value = createFallbackProfile()
    showToast(err.message)
  } finally {
    isLoading.value = false
  }
})

const getRankIcon = (rank) => {
  const icons = {
    Beginner: '',
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
  <div class="min-h-screen bg-gray-100 ayumu-page text-gray-900 dark:text-gray-100">
    <AppHeader />
    <Toast v-if="toast" :key="toast.key" :message="toast.message" :type="toast.type" />

    <div v-if="isLoading" class="min-h-[70vh] flex items-center justify-center">
      <svg class="animate-spin h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>

    <main v-else-if="profile" class="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div class="mb-4 flex items-center justify-between gap-4">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Profil</p>
          <h1 class="mt-1 text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Progresmu</h1>
        </div>
        <router-link
          to="/"
          class="ayumu-secondary-button px-4 py-2 rounded-full border border-gray-300 bg-white text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Kembali
        </router-link>
      </div>

      <div class="bg-white ayumu-panel dark:bg-gray-800 p-8 sm:p-10 rounded-2xl border border-gray-200 shadow-sm">
      <div v-if="error" class="mb-8 p-4 bg-amber-50 ayumu-note-surface border border-amber-200 rounded-lg">
        <p class="text-xs text-amber-700 dark:text-amber-400">{{ error }}</p>
      </div>

      <div class="text-center mb-10">
        <img v-if="authStore.discordAvatar" :src="authStore.discordAvatar" class="w-16 h-16 rounded-full mx-auto mb-4 ring-2 ring-gray-200 dark:ring-gray-600" />
        <div v-else class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          {{ getRankIcon(profile.rank) }}
        </div>
        <h2 class="text-2xl font-black text-gray-900 dark:text-white">{{ profile.user.display_name || profile.user.username }}</h2>
        <p class="text-sm font-bold text-gray-400 mt-1">{{ profile.rank.name }} • {{ profile.stats.total_xp || 0 }} XP</p>
      </div>

      <div v-if="!authStore.isAuthenticated && profile.user.is_anonymous !== false" class="mb-8 p-4 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-lg">
        <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">Masuk dengan Discord untuk menyimpan progresmu secara permanen.</p>
        <button @click="signingIn = true; authStore.signInWithDiscord().catch(() => signingIn = false)"
          class="w-full flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-lg transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
          </svg>
          {{ signingIn ? 'Mengalihkan...' : 'Masuk dengan Discord' }}
        </button>
      </div>

      <div v-if="authStore.isAuthenticated && profile.user.is_anonymous !== false" class="mb-8 p-4 bg-amber-50 ayumu-note-surface border border-amber-200 rounded-lg">
        <p class="text-xs text-amber-700 dark:text-amber-400 mb-3">Kamu punya progres anonim yang bisa ditautkan ke akun Discord-mu.</p>
        <button @click="claimProgress" :disabled="isClaiming"
          class="ayumu-primary w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {{ isClaiming ? 'Mengklaim...' : 'Klaim Progres' }}
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div class="ayumu-card-surface text-center p-4 bg-gray-50 rounded-lg border border-transparent dark:border-gray-700">
          <p class="text-2xl font-black text-gray-700 dark:text-gray-300">{{ profile.stats.total_exams }}</p>
          <p class="text-[10px] font-bold text-gray-400 uppercase">Ujian</p>
        </div>
        <div class="ayumu-card-surface text-center p-4 bg-gray-50 rounded-lg border border-transparent dark:border-gray-700">
          <p class="text-2xl font-black text-gray-700 dark:text-gray-300">{{ profile.stats.best_score }}</p>
          <p class="text-[10px] font-bold text-gray-400 uppercase">Skor Terbaik</p>
        </div>
        <div class="ayumu-card-surface text-center p-4 bg-gray-50 rounded-lg border border-transparent dark:border-gray-700">
          <p class="text-2xl font-black text-gray-700 dark:text-gray-300">{{ profile.stats.current_streak }}</p>
          <p class="text-[10px] font-bold text-gray-400 uppercase">Streak</p>
        </div>
        <div class="ayumu-card-surface text-center p-4 bg-gray-50 rounded-lg border border-transparent dark:border-gray-700">
          <p class="text-2xl font-black text-gray-700 dark:text-gray-300">{{ profile.stats.avg_score }}%</p>
          <p class="text-[10px] font-bold text-gray-400 uppercase">Rata-rata</p>
        </div>
      </div>

      <div v-if="profile.achievements.length > 0" class="mb-10">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pencapaian</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="ach in profile.achievements" :key="ach.code" class="ayumu-card-surface flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-transparent dark:border-gray-700">
            <div class="w-10 h-10 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg flex items-center justify-center text-lg">
              {{ getRankIcon({ name: ach.category }) }}
            </div>
            <div>
              <p class="text-sm font-bold text-gray-900 dark:text-white">{{ ach.name }}</p>
              <p class="text-[10px] text-gray-400">{{ ach.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="profile.recent_results.length > 0" class="mb-10">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Hasil Terbaru</h3>
        <div class="space-y-2">
          <div v-for="result in profile.recent_results" :key="result.id" class="ayumu-card-surface flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-transparent dark:border-gray-700">
            <div>
              <p class="text-sm font-bold text-gray-900 dark:text-white">Ujian {{ result.level }}</p>
              <p class="text-[10px] text-gray-400">{{ new Date(result.completed_at).toLocaleDateString() }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-gray-700 dark:text-gray-300">{{ result.score }}/{{ result.total_questions }}</p>
              <p class="text-[10px] text-gray-400">{{ result.percentage }}%</p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button @click="goHome" class="ayumu-primary flex-1 py-4 bg-gray-800 text-white text-xs tracking-widest font-black rounded-lg hover:bg-gray-700 transition-colors">
          MULAI UJIAN
        </button>
        <router-link to="/anki" class="ayumu-secondary-button flex-1 py-4 bg-white text-center text-gray-700 text-xs tracking-widest font-black rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
          BUKA ANKI
        </router-link>
      </div>
      </div>
    </main>

    <div v-else class="min-h-[70vh] flex items-center justify-center">
      <div class="max-w-md text-center">
      <p class="text-red-500 mb-4">Data profil tidak tersedia.</p>
      <button @click="goHome" class="ayumu-primary px-6 py-3 bg-gray-800 text-white rounded-lg text-xs font-black uppercase tracking-widest">
        Kembali ke Beranda
      </button>
      </div>
    </div>
  </div>
</template>
