<script setup>
import { computed, ref } from 'vue'
import { useSessionStore } from '../store/session.js'

const props = defineProps({
  question: Object,
  index: Number,
})

const sessionStore = useSessionStore()
const audioRef = ref(null)

const sectionDisplayMap = {
  grammar: 'GRAMMAR / 文字・語彙',
  reading: 'READING / 読解',
  listening: 'LISTENING / 聴解',
}

const sectionLabel = computed(() => {
  const section = props.question?.section || ''
  return sectionDisplayMap[section] || section.toUpperCase()
})

const isListening = computed(() => {
  return props.question?.section === 'listening'
})

const audioAsset = computed(() => {
  if (!props.question?.assets) return null
  return props.question.assets.find(a => a.type === 'audio')
})

const imageAssets = computed(() => {
  if (!props.question?.assets) return []
  return props.question.assets.filter(a => a.type === 'image')
})

const options = computed(() => {
  if (!props.question?.options) return []
  return props.question.options.map((opt, idx) => ({
    id: idx + 1,
    label: opt.label || opt.option_label || '',
    value: opt.value || opt.option_value || String(idx + 1),
  }))
})

const selectedOptionId = computed(() => sessionStore.userAnswers[props.index])

const selectOption = (optionValue) => {
  sessionStore.saveAnswer(props.index, optionValue)
}

const toggleFlag = () => {
  sessionStore.toggleFlag(props.index)
}
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm w-full">
    <!-- Section + Question Header -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-4">
        <span class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Question {{ index + 1 }} of {{ sessionStore.totalQuestions }}
        </span>
        <span class="text-xs font-medium text-gray-400 dark:text-gray-500">
          {{ sectionLabel }}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <button @click="toggleFlag"
          class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded border transition-colors"
          :class="sessionStore.isFlagged(index)
            ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-600'
            : 'border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
          {{ sessionStore.isFlagged(index) ? 'Flagged' : 'Flag for review' }}
        </button>
        <span class="text-xs font-medium px-2 py-1 rounded"
          :class="selectedOptionId
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'"
        >
          {{ selectedOptionId ? 'Answered' : 'No response' }}
        </span>
      </div>
    </div>

    <!-- Audio Player (listening only) -->
    <div v-if="isListening && audioAsset" class="px-6 pt-4">
      <div class="bg-gray-800 dark:bg-gray-900 rounded-lg p-3 flex items-center gap-3">
        <audio ref="audioRef" :src="audioAsset.url" class="hidden" controls></audio>
        <div class="flex items-center gap-2 w-full">
          <button @click="$refs.audioRef?.play()" class="text-white hover:text-gray-300 transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <div class="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
            <div class="h-full bg-white rounded-full" style="width: 0%"></div>
          </div>
          <span class="text-xs text-gray-400 font-mono">0:00 / 0:25</span>
          <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          <input type="range" min="0" max="1" step="0.1" class="w-16 accent-white" />
        </div>
      </div>
    </div>

    <!-- Image Assets -->
    <div v-if="imageAssets.length" class="px-6 pt-4">
      <div class="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 p-4 flex justify-center">
        <img v-for="asset in imageAssets" :key="asset.id" :src="asset.url" class="max-w-full h-auto max-h-80 object-contain" />
      </div>
    </div>

    <!-- Passage -->
    <div v-if="question?.passage" class="px-6 pt-4">
      <div class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Passage</h4>
        <div class="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-line">{{ question.passage.content }}</div>
      </div>
    </div>

    <!-- Prompt / Context -->
    <div class="px-6 pt-4 pb-2">
      <p v-if="question?.context" class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
        {{ question.context }}
      </p>
      <p v-if="question?.prompt" class="text-base md:text-lg font-medium text-gray-900 dark:text-white leading-relaxed">
        {{ question.prompt }}
      </p>
    </div>

    <!-- Options -->
    <div class="px-6 pb-6 pt-2">
      <div class="space-y-2">
        <button v-for="opt in options" :key="opt.id"
          @click="selectOption(opt.value)"
          class="w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
          :class="selectedOptionId === opt.value
            ? 'border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-700'
            : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-600'"
        >
          <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
            :class="selectedOptionId === opt.value
              ? 'border-gray-600 dark:border-gray-400'
              : 'border-gray-300 dark:border-gray-600'"
          >
            <span v-if="selectedOptionId === opt.value" class="w-2 h-2 rounded-full bg-gray-600 dark:bg-gray-400"></span>
          </span>
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400 mr-1">{{ opt.id }}.</span>
          <span class="text-sm text-gray-800 dark:text-gray-200">{{ opt.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
