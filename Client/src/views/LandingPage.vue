<script setup>
import { useRouter } from 'vue-router'
import { examStore } from '../store/exam.js'

const router = useRouter()

const startSession = () => {
  examStore.startSession('full_exam')
  router.push({ name: 'exam', params: { sessionType: 'full_exam' } })
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-6 bg-primary-50 dark:bg-[#0a0a0c] text-primary-950 dark:text-primary-50 transition-colors duration-300">
    <div class="max-w-md w-full text-center">
      <h1 class="text-6xl font-black mb-4 text-primary-700 dark:text-primary-400 transition-colors duration-300">Ayumu</h1>
      <p class="text-primary-600/60 dark:text-primary-300/60 mb-10 font-bold tracking-[0.2em] uppercase text-xs transition-colors duration-300">JLPT Practice</p>
      
      <div class="space-y-4">
        <button @click="startSession" class="w-full p-8 bg-white dark:bg-[#16161a] border-4 border-primary-100 dark:border-primary-900/40 hover:border-primary-400 dark:hover:border-primary-600 rounded-[2rem] shadow-xl shadow-primary-200/40 dark:shadow-none transition-all flex items-center justify-between group">
          <div class="text-left">
            <span class="block text-2xl font-black text-primary-800 dark:text-white mb-1 transition-colors duration-300">Start N5 Exam</span>
            <span class="text-xs font-bold text-primary-400 dark:text-primary-500 uppercase tracking-widest transition-colors duration-300">Mojigoi & Dokkai • 65 Questions</span>
          </div>
          <div class="w-14 h-14 bg-primary-600 text-white rounded-3xl flex items-center justify-center group-hover:scale-110 transition-all shadow-lg shadow-primary-600/40">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </button>
      </div>

      <div class="mt-12 flex flex-col items-center gap-6">
        <button @click="examStore.toggleDarkMode()" class="px-6 py-3 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20">
          {{ examStore.isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme' }}
        </button>
        
        <div class="flex items-center gap-3">
          <button @click="examStore.setTheme('lavender')" class="w-8 h-8 rounded-full bg-[#f5f3ff] shadow-sm hover:scale-110 transition-all" :class="examStore.activeTheme === 'lavender' ? 'ring-4 ring-offset-2 dark:ring-offset-[#0a0a0c] ring-[#7c3aed]' : 'border-2 border-[#7c3aed]'" title="Lavender"></button>
          <button @click="examStore.setTheme('philia')" class="w-8 h-8 rounded-full bg-[#eef2ff] shadow-sm hover:scale-110 transition-all" :class="examStore.activeTheme === 'philia' ? 'ring-4 ring-offset-2 dark:ring-offset-[#0a0a0c] ring-[#4051b5]' : 'border-2 border-[#4051b5]'" title="Philia Space (#4051b5)"></button>
          <button @click="examStore.setTheme('wisteria')" class="w-8 h-8 rounded-full bg-[#fcfaff] shadow-sm hover:scale-110 transition-all" :class="examStore.activeTheme === 'wisteria' ? 'ring-4 ring-offset-2 dark:ring-offset-[#0a0a0c] ring-[#8f62c8]' : 'border-2 border-[#8f62c8]'" title="Wisteria"></button>
          <button @click="examStore.setTheme('mauve')" class="w-8 h-8 rounded-full bg-[#f8f7fa] shadow-sm hover:scale-110 transition-all" :class="examStore.activeTheme === 'mauve' ? 'ring-4 ring-offset-2 dark:ring-offset-[#0a0a0c] ring-[#827993]' : 'border-2 border-[#827993]'" title="Mauve"></button>
        </div>
      </div>
    </div>
  </div>
</template>
