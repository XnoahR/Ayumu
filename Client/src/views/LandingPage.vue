<script setup>
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import { ref } from 'vue'

const router = useRouter()
const sessionStore = useSessionStore()
const isLoading = ref(false)

const startSession = async () => {
  isLoading.value = true
  try {
    const data = await sessionStore.createSession('N5', 'balanced_75')
    router.push({ name: 'exam', params: { sessionCode: data.session_code } })
  } catch (error) {
    console.error('Failed to start session:', error)
    alert('Failed to start exam. Please try again.')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-6 bg-primary-50 dark:bg-[#0a0a0c] text-primary-950 dark:text-primary-50 transition-colors duration-300">
    <div class="max-w-md w-full text-center">
      <h1 class="text-6xl font-black mb-4 text-primary-700 dark:text-primary-400 transition-colors duration-300">Ayumu</h1>
      <p class="text-primary-600/60 dark:text-primary-300/60 mb-10 font-bold tracking-[0.2em] uppercase text-xs transition-colors duration-300">JLPT Practice</p>
      
      <div class="space-y-4">
        <button @click="startSession" :disabled="isLoading" class="w-full p-8 bg-white dark:bg-[#16161a] border-4 border-primary-100 dark:border-primary-900/40 hover:border-primary-400 dark:hover:border-primary-600 rounded-[2rem] shadow-xl shadow-primary-200/40 dark:shadow-none transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed">
          <div class="text-left">
            <span class="block text-2xl font-black text-primary-800 dark:text-white mb-1 transition-colors duration-300">Start N5 Exam</span>
            <span class="text-xs font-bold text-primary-400 dark:text-primary-500 uppercase tracking-widest transition-colors duration-300">Mojigoi & Dokkai • 65 Questions</span>
          </div>
          <div v-if="!isLoading" class="w-14 h-14 bg-primary-600 text-white rounded-3xl flex items-center justify-center group-hover:scale-110 transition-all shadow-lg shadow-primary-600/40">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <div v-else class="w-14 h-14 flex items-center justify-center">
            <svg class="animate-spin h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        </button>
      </div>

      <div class="mt-12 flex flex-col items-center gap-6">
        <router-link to="/profile" class="px-6 py-3 bg-primary-50 dark:bg-[#202028] text-primary-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
          View Profile
        </router-link>
      </div>
    </div>
  </div>
</template>
