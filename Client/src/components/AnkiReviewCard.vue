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
  mapping: {
    type: Object,
    required: true,
  },
  isBackVisible: {
    type: Boolean,
    default: false,
  },
  activeTheme: {
    type: String,
    default: 'kiku_like',
  },
  enabledPlugins: {
    type: Array,
    default: () => [],
  },
})

const fieldEntries = computed(() => {
  if (!props.card?.fields) return []
  return Object.values(props.card.fields).sort((left, right) => (left.order || 0) - (right.order || 0))
})

function resolveField(fieldName) {
  if (!fieldName || !props.card?.fields) return null
  return props.card.fields[fieldName] || null
}

const frontField = computed(() => resolveField(props.mapping.front_field) || fieldEntries.value[0] || null)
const backField = computed(() => resolveField(props.mapping.back_field) || fieldEntries.value[1] || fieldEntries.value[0] || null)
const hintField = computed(() => resolveField(props.mapping.hint_field))
const audioField = computed(() => resolveField(props.mapping.audio_field))
const imageField = computed(() => resolveField(props.mapping.image_field))

const showMetaFooter = computed(() => props.enabledPlugins.includes('review_meta_footer'))
const showHintCallout = computed(() => props.enabledPlugins.includes('hint_callout'))
const useKikuLayout = computed(() => props.activeTheme === 'kiku_like' || props.enabledPlugins.includes('kiku_like_cards'))

const frontHtml = computed(() => frontField.value?.html || '<p>Tidak ada field depan.</p>')
const backHtml = computed(() => backField.value?.html || '<p>Tidak ada field belakang.</p>')
const hintHtml = computed(() => hintField.value?.html || '')

const displayImages = computed(() => {
  const refs = imageField.value?.images || []
  return refs.filter((src) => /^https?:\/\//.test(src) || src.startsWith('data:'))
})

const imageFallbackRefs = computed(() => {
  const refs = imageField.value?.images || []
  return refs.filter((src) => !/^https?:\/\//.test(src) && !src.startsWith('data:'))
})

const audioRefs = computed(() => audioField.value?.audio || props.card?.audio || [])

const stateLabel = computed(() => {
  if (!props.card?.state) return 'Review'
  if (props.card.state.is_new) return 'Baru'
  if (props.card.state.is_learning) return 'Belajar'
  if (props.card.state.is_review) return 'Review'
  return 'Kartu'
})
</script>

<template>
  <section class="rounded-[24px] border border-gray-200 ayumu-panel overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
      <div>
        <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">{{ deckName || 'Dek Anki' }}</p>
        <h2 class="mt-1 text-xl font-black text-gray-950 dark:text-white">{{ card?.model_name || 'Review Ayumu' }}</h2>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          {{ stateLabel }}
        </span>
        <span
          class="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white"
          :class="useKikuLayout ? 'bg-[#4f46e5]' : 'bg-slate-700'"
        >
          {{ activeTheme === 'kiku_like' ? 'Kiku-like' : 'Ayumu Focus' }}
        </span>
      </div>
    </div>

    <div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div class="min-w-0 px-5 py-6 sm:px-7 sm:py-8">
        <div class="rounded-[22px] border border-gray-200 bg-white px-5 py-6 shadow-sm dark:border-gray-700 dark:bg-[#101828] sm:px-7 sm:py-8">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">
              {{ isBackVisible ? 'Belakang' : 'Depan' }}
            </p>
            <p class="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {{ frontField?.name || '-' }}<span v-if="isBackVisible && backField"> / {{ backField.name }}</span>
            </p>
          </div>

          <div class="mt-5">
            <div class="review-rich front-surface text-gray-800 dark:text-gray-100" v-html="frontHtml"></div>
          </div>

          <div v-if="isBackVisible" class="mt-8 border-t border-dashed border-gray-200 pt-6 dark:border-gray-700">
            <div class="review-rich back-surface text-gray-800 dark:text-gray-100" v-html="backHtml"></div>
          </div>

          <div
            v-if="hintHtml && (isBackVisible || mapping.show_hint_before_flip)"
            class="mt-6 rounded-2xl border border-[#2d1d4a] bg-[#180c2c] px-4 py-4 text-sm text-indigo-50"
            :class="{ 'ring-1 ring-indigo-500/30': showHintCallout }"
          >
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-200">Petunjuk</p>
            <div class="review-rich mt-2 text-indigo-50" v-html="hintHtml"></div>
          </div>
        </div>

        <div v-if="showMetaFooter" class="mt-5 rounded-[18px] border border-gray-200 ayumu-note-surface px-4 py-4 dark:border-gray-700">
          <div class="flex flex-wrap items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300">
            <span class="rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-700 dark:bg-[#101828]">Model: {{ card?.model_name || '-' }}</span>
            <span class="rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-700 dark:bg-[#101828]">Dek: {{ deckName || '-' }}</span>
            <span
              v-for="tag in card?.tags || []"
              :key="tag"
              class="rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-700 dark:bg-[#101828]"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>

      <aside class="border-t border-gray-200 bg-[#f7f8fb] px-5 py-6 dark:border-gray-700 dark:bg-[#0f1117] lg:border-l lg:border-t-0">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Media & Info</p>
          <h3 class="mt-1 text-sm font-black text-gray-900 dark:text-white">Panel pendamping</h3>
        </div>

        <div class="mt-5 space-y-4">
          <section class="rounded-[18px] border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-[#101828]">
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Field aktif</p>
            <div class="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p><strong class="text-gray-900 dark:text-white">Depan:</strong> {{ frontField?.name || '-' }}</p>
              <p><strong class="text-gray-900 dark:text-white">Belakang:</strong> {{ backField?.name || '-' }}</p>
              <p><strong class="text-gray-900 dark:text-white">Hint:</strong> {{ hintField?.name || '-' }}</p>
              <p><strong class="text-gray-900 dark:text-white">Audio:</strong> {{ audioField?.name || '-' }}</p>
              <p><strong class="text-gray-900 dark:text-white">Gambar:</strong> {{ imageField?.name || '-' }}</p>
            </div>
          </section>

          <section v-if="displayImages.length || imageFallbackRefs.length" class="rounded-[18px] border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-[#101828]">
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Gambar</p>
            <div class="mt-3 space-y-3">
              <img
                v-for="src in displayImages"
                :key="src"
                :src="src"
                class="w-full rounded-2xl border border-gray-200 object-cover dark:border-gray-700"
              />
              <div v-if="imageFallbackRefs.length" class="space-y-2">
                <p class="text-xs text-gray-500 dark:text-gray-400">Referensi media lokal:</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="src in imageFallbackRefs"
                    :key="src"
                    class="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-bold text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  >
                    {{ src }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="audioRefs.length" class="rounded-[18px] border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-[#101828]">
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Audio</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="audio in audioRefs"
                :key="audio"
                class="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-bold text-gray-600 dark:border-gray-700 dark:text-gray-300"
              >
                {{ audio }}
              </span>
            </div>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
              File audio tetap mengikuti koleksi desktop Anki. Untuk playback penuh, Anki desktop masih jadi sumber utama.
            </p>
          </section>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.review-rich :deep(*) {
  max-width: 100%;
  word-break: break-word;
}

.review-rich :deep(p:first-child) {
  margin-top: 0;
}

.review-rich :deep(p:last-child) {
  margin-bottom: 0;
}

.review-rich :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 1rem;
}

.front-surface :deep(*) {
  line-height: 1.75;
  font-size: 1.2rem;
}

.back-surface :deep(*) {
  line-height: 1.7;
  font-size: 1.05rem;
}
</style>
