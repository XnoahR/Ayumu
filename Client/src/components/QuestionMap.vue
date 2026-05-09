<script setup>
import { computed, ref } from 'vue'
import { useSessionStore } from '../store/session.js'

const emit = defineEmits(['submit'])

const sessionStore = useSessionStore()

const sectionDisplayMap = {
  grammar: 'PENGETAHUAN BAHASA',
  reading: 'MEMBACA',
  listening: 'MENYIMAK',
}

const collapsedSections = ref(new Set())

const toggleSection = (section) => {
  const newSet = new Set(collapsedSections.value)
  if (newSet.has(section)) {
    newSet.delete(section)
  } else {
    newSet.add(section)
  }
  collapsedSections.value = newSet
}

const isSectionCollapsed = (section) => collapsedSections.value.has(section)

const sections = computed(() => {
  const breakdown = sessionStore.sectionBreakdown
  const entries = Object.entries(breakdown)
  if (entries.length === 0 && sessionStore.totalQuestions > 0) {
    return [{
      key: 'all',
      label: 'SEMUA SOAL',
      total: sessionStore.totalQuestions,
      answered: sessionStore.answeredCount,
      flagged: sessionStore.flaggedCount,
      indices: Array.from({ length: sessionStore.totalQuestions }, (_, i) => i),
    }]
  }
  return entries.map(([key, data]) => ({
    key,
    label: sectionDisplayMap[key] || key.toUpperCase(),
    ...data,
  }))
})

const getQuestionColor = (idx) => {
  if (sessionStore.currentIndex === idx) return 'current'
  if (sessionStore.isFlagged(idx)) return 'flagged'
  if (sessionStore.userAnswers[idx] !== undefined) return 'answered'
  return 'unanswered'
}

const colorClasses = {
  current: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200',
  answered: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700',
  flagged: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700',
  unanswered: 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600',
}
</script>

<template>
  <div class="flex flex-col h-full">
    <h3 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Navigasi Soal</h3>

    <div class="flex-1 overflow-y-auto space-y-2">
      <div v-for="section in sections" :key="section.key" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          @click.stop="toggleSection(section.key)"
          class="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-700 dark:text-gray-300">{{ section.label }}</span>
            <span class="text-xs font-medium text-gray-400 dark:text-gray-500">{{ section.answered }}/{{ section.total }}</span>
          </div>
          <svg class="w-4 h-4 text-gray-400 transition-transform" :class="isSectionCollapsed(section.key) ? '' : 'rotate-180'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="!isSectionCollapsed(section.key)" class="p-3">
          <div class="grid grid-cols-6 gap-1.5">
            <button
              v-for="idx in section.indices"
              :key="'sec-' + idx"
              @click.stop="sessionStore.goToQuestion(idx)"
              class="relative aspect-square rounded flex items-center justify-center text-xs font-medium border transition-all cursor-pointer"
              :class="colorClasses[getQuestionColor(idx)]"
            >
              {{ idx + 1 }}
              <span v-if="sessionStore.isFlagged(idx)" class="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700 my-3"></div>

    <div class="space-y-2 mb-4">
      <div class="flex justify-between text-xs">
        <span class="text-gray-500 dark:text-gray-400">Terjawab</span>
        <span class="font-bold text-gray-700 dark:text-gray-300">{{ sessionStore.answeredCount }} / {{ sessionStore.totalQuestions }}</span>
      </div>
      <div class="flex justify-between text-xs">
        <span class="text-gray-500 dark:text-gray-400">Ditandai</span>
        <span class="font-bold text-amber-600 dark:text-amber-400">{{ sessionStore.flaggedCount }}</span>
      </div>
      <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div class="h-full bg-emerald-500 rounded-full transition-all" :style="{ width: sessionStore.progress + '%' }"></div>
      </div>
    </div>

    <div class="space-y-1.5 mb-4 text-xs">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-gray-800 dark:bg-gray-200 inline-block"></span>
        <span class="text-gray-500 dark:text-gray-400">Saat ini</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 inline-block"></span>
        <span class="text-gray-500 dark:text-gray-400">Terjawab</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 inline-block"></span>
        <span class="text-gray-500 dark:text-gray-400">Ditandai</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 inline-block"></span>
        <span class="text-gray-500 dark:text-gray-400">Belum dijawab</span>
      </div>
    </div>

    <button
      @click.stop="emit('submit')"
      class="w-full py-3 bg-red-900 dark:bg-red-700 text-white font-bold rounded text-xs tracking-wider hover:bg-red-800 dark:hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
    >
      SELESAIKAN UJIAN
    </button>
  </div>
</template>
