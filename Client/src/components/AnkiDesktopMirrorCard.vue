<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    default: null,
  },
  deckName: {
    type: String,
    default: '',
  },
  bridgeBaseUrl: {
    type: String,
    default: '',
  },
  sessionToken: {
    type: String,
    default: '',
  },
  audioAutoplay: {
    type: Boolean,
    default: false,
  },
  isBackVisible: {
    type: Boolean,
    default: false,
  },
})

const iframeSrc = computed(() => {
  if (!props.bridgeBaseUrl || !props.sessionToken) return ''
  const base = props.bridgeBaseUrl.replace(/\/$/, '')
  const side = props.isBackVisible ? 'back' : 'front'
  const autoplay = props.audioAutoplay ? '1' : '0'
  return `${base}/review/render?session=${encodeURIComponent(props.sessionToken)}&side=${encodeURIComponent(side)}&autoplay=${autoplay}`
})

const stateLabel = computed(() => {
  if (!props.card?.state) return 'Review'
  if (props.card.state.is_new) return 'Baru'
  if (props.card.state.is_learning) return 'Belajar'
  if (props.card.state.is_review) return 'Review'
  return 'Kartu'
})
</script>

<template>
  <section class="rounded-[24px] border border-gray-300 ayumu-panel overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
      <div>
        <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Mirror Anki Desktop</p>
        <h2 class="mt-1 text-xl font-black text-gray-950 dark:text-white">{{ deckName || 'Deck Anki' }}</h2>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-gray-600 dark:border-gray-700 dark:bg-[#101828] dark:text-gray-300">
          {{ stateLabel }}
        </span>
        <span class="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          {{ isBackVisible ? 'Back' : 'Front' }}
        </span>
      </div>
    </div>

    <div class="bg-[#0b0f17] px-3 py-3 sm:px-5 sm:py-5">
      <iframe
        class="h-[540px] w-full rounded-[20px] border border-[#354052] bg-[#141921]"
        :src="iframeSrc"
        allow="autoplay"
        sandbox="allow-scripts allow-same-origin"
        title="Anki desktop mirror card"
      />
    </div>
  </section>
</template>
