<script setup>
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import { useAuthStore } from '../store/auth.js'
import { ref } from 'vue'
import Toast from '../components/Toast.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const authStore = useAuthStore()
const selectedLevel = ref(null)
const isLoading = ref(false)
const signingIn = ref(false)
const toast = ref(null)

const levels = [
  { code: 'N5', label: 'N5', desc: 'Basic', color: 'from-emerald-400 to-emerald-600' },
  { code: 'N4', label: 'N4', desc: 'Elementary', color: 'from-blue-400 to-blue-600' },
  { code: 'N3', label: 'N3', desc: 'Intermediate', color: 'from-indigo-400 to-indigo-600' },
  { code: 'N2', label: 'N2', desc: 'Upper-Intermediate', color: 'from-purple-400 to-purple-600' },
  { code: 'N1', label: 'N1', desc: 'Advanced', color: 'from-red-400 to-red-600' },
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
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <Toast v-if="toast" :key="toast.key" :message="toast.message" :type="toast.type" />

    <div class="max-w-lg w-full text-center">
      <h1 class="text-4xl font-black mb-2 text-gray-900 dark:text-white">Ayumu</h1>
      <p class="text-gray-400 dark:text-gray-500 font-bold tracking-[0.2em] uppercase text-xs mb-10">JLPT Practice</p>

      <div class="mb-8">
        <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Select Level</p>
        <div class="grid grid-cols-5 gap-2">
          <button v-for="lvl in levels" :key="lvl.code"
            @click="selectedLevel = lvl.code"
            class="flex flex-col items-center justify-center py-4 rounded-lg border-2 transition-all"
            :class="selectedLevel === lvl.code
              ? 'border-gray-800 dark:border-gray-200 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'"
          >
            <span class="text-lg font-black">{{ lvl.label }}</span>
            <span class="text-[9px] font-medium opacity-60">{{ lvl.desc }}</span>
          </button>
        </div>
      </div>

      <button @click="startSession" :disabled="!selectedLevel || isLoading"
        class="w-full py-4 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-xs font-black uppercase tracking-widest rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
      >
        <span v-if="isLoading">Starting...</span>
        <span v-else>Start {{ selectedLevel || 'Exam' }}</span>
      </button>

      <div class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
        <template v-if="authStore.isAuthenticated">
          <div class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <img v-if="authStore.discordAvatar" :src="authStore.discordAvatar" class="w-8 h-8 rounded-full" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{{ authStore.discordUsername }}</span>
          </div>
        </template>
        <template v-else>
          <button @click="signingIn = true; authStore.signInWithDiscord().catch(() => signingIn = false)"
            class="w-full flex items-center justify-center gap-2 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <svg class="w-4 h-4" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
            </svg>
            {{ signingIn ? 'Redirecting...' : 'Sign in with Discord' }}
          </button>
          <p class="mt-2 text-[10px] text-gray-400 dark:text-gray-500">Sign in to save progress and unlock achievements</p>
        </template>
      </div>

      <div class="mt-8">
        <router-link to="/profile"
          class="inline-block px-6 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          View Profile
        </router-link>
      </div>
    </div>
  </div>
</template>
