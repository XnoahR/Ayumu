<script setup>
import { useSessionStore } from '../store/session.js'

const props = defineProps({
  totalQuestions: Number
})

const sessionStore = useSessionStore()

const isAnswered = (index) => !!sessionStore.userAnswers[index]
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="mb-6 flex-1 overflow-y-auto no-scrollbar">
      <div class="grid grid-cols-5 gap-2">
        <button v-for="idx in totalQuestions" :key="'q'+idx"
          @click="sessionStore.goToQuestion(idx - 1)"
          class="aspect-square rounded-xl flex items-center justify-center font-bold text-xs transition-all border-2"
          :class="[
            sessionStore.currentIndex === (idx - 1) ? 'border-primary-600 ring-4 ring-primary-100 dark:ring-primary-900/20' : 'border-transparent',
            isAnswered(idx - 1) 
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' 
              : 'bg-primary-50 dark:bg-primary-900/20 text-primary-400 dark:text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-800/40'
          ]"
        >
          {{ idx }}
        </button>
      </div>
    </div>

    <div class="pt-6 border-t-2 border-primary-100 dark:border-primary-900/30 transition-colors duration-300 shrink-0">
      <div class="flex justify-between items-center mb-4">
        <div>
          <p class="text-[10px] font-black text-primary-400 dark:text-primary-500/50 uppercase tracking-widest mb-1 transition-colors duration-300">Answered</p>
          <p class="text-3xl font-black text-primary-700 dark:text-primary-400 transition-colors duration-300">{{ sessionStore.answeredCount }}<span class="text-sm opacity-30">/{{ totalQuestions }}</span></p>
        </div>
      </div>
      <button @click="$emit('submit')" class="w-full py-3 bg-primary-950 dark:bg-primary-600 text-white font-black rounded-xl tracking-[0.15em] text-xs hover:bg-primary-800 transition-all shadow-lg shadow-primary-950/20 dark:shadow-primary-600/20">
        FINISH EXAM
      </button>
    </div>
  </div>
</template>
