<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAnkiWorkspace } from '../../composables/useAnkiWorkspace.js'

const router = useRouter()
const anki = useAnkiWorkspace()

const selectedDeckStats = computed(() => {
  const deck = anki.selectedDeck.value
  if (!deck) return []

  return [
    { label: 'Baru', value: deck.new_count || 0, tone: 'text-sky-300' },
    { label: 'Belajar', value: deck.learn_count || 0, tone: 'text-rose-300' },
    { label: 'Due', value: deck.due_count || 0, tone: 'text-emerald-300' },
    { label: 'Total', value: deck.total_cards || 0, tone: 'text-white' },
  ]
})

function hasChildren(deckId) {
  return anki.decks.value.some((candidate) => String(candidate.parent_id) === String(deckId))
}

function deckPrefix(deck) {
  if ((deck.depth || 0) > 0) return ''
  return hasChildren(deck.id) ? '-' : '•'
}

function deckIndent(depth = 0) {
  return `${Math.max(0, depth) * 1.5}rem`
}

async function openReview() {
  const started = await anki.startSelectedDeckReview()
  if (!started) return

  router.push('/anki/review')
}
</script>

<template>
  <section class="space-y-6">
    <section class="rounded-[26px] border border-gray-300 ayumu-panel deck-browser-shell overflow-hidden">
      <div class="border-b border-white/10 px-5 py-5 sm:px-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 ayumu-accent-text">Deck Browser</p>
            <h2 class="mt-1 text-xl font-black text-white">Pilih deck seperti tampilan desktop</h2>
            <p class="mt-2 max-w-3xl text-sm text-gray-300/80">
              Halaman ini sekarang dibuat lebih mirip daftar deck Anki: fokus ke nama deck, angka review, dan pemilihan deck aktif tanpa panel-panel kecil yang terlalu ramai.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em]">
            <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-gray-200">
              {{ anki.bridgeHealth.value?.profile_name || 'Profil belum terbaca' }}
            </span>
            <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-gray-300">
              {{ anki.bridgeHealth.value?.anki_version || 'Anki -' }}
            </span>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
        <section class="rounded-[24px] border border-white/10 bg-black/30 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-md">
          <div class="grid grid-cols-[minmax(0,1fr)_72px_72px_72px] items-center gap-3 border-b border-white/10 px-4 py-4 text-sm font-black text-white/95 sm:px-5">
            <span>Deck</span>
            <span class="text-center text-sky-200">New</span>
            <span class="text-center text-rose-200">Learn</span>
            <span class="text-center text-emerald-200">Due</span>
          </div>

          <div v-if="anki.decks.value.length" class="max-h-[60vh] overflow-y-auto px-2 py-3 sm:px-3">
            <button
              v-for="deck in anki.decks.value"
              :key="deck.id"
              type="button"
              class="mb-1 grid w-full grid-cols-[minmax(0,1fr)_72px_72px_72px] items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition-colors sm:px-4"
              :class="String(deck.id) === String(anki.selectedDeckId.value)
                ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                : 'text-gray-200 hover:bg-white/6'"
              @click="anki.selectedDeckId.value = String(deck.id)"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2" :style="{ paddingLeft: deckIndent(deck.depth || 0) }">
                  <span class="w-4 shrink-0 text-center text-sm text-white/80">{{ deckPrefix(deck) }}</span>
                  <span class="truncate text-[15px] font-semibold">
                    {{ deck.name }}
                  </span>
                </div>
              </div>

              <span class="text-center text-[15px] font-semibold text-sky-300">{{ deck.new_count || 0 }}</span>
              <span class="text-center text-[15px] font-semibold text-rose-300">{{ deck.learn_count || 0 }}</span>
              <span class="text-center text-[15px] font-semibold text-emerald-300">{{ deck.due_count || 0 }}</span>
            </button>
          </div>

          <div v-else class="px-5 py-8">
            <div class="rounded-[18px] border border-dashed border-white/15 bg-white/[0.03] px-4 py-5">
              <p class="text-sm font-bold text-white">Deck belum tampil.</p>
              <p class="mt-2 text-sm text-gray-300/80">
                Hubungkan bridge lokal dulu, lalu buka koleksi Anki desktop. Setelah itu daftar deck akan muncul di sini.
              </p>

              <div class="mt-4 space-y-2">
                <div
                  v-for="(step, index) in anki.installSteps"
                  :key="step"
                  class="flex items-start gap-3 rounded-[14px] border border-white/10 bg-black/20 px-3 py-3"
                >
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-black text-white">
                    {{ index + 1 }}
                  </span>
                  <p class="text-sm text-gray-300">{{ step }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-white/10 px-4 py-4 sm:px-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div class="space-y-3">
                <div class="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em]">
                  <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-gray-200">
                    {{ anki.topLevelDecks.value.length }} deck
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sky-200">
                    New {{ anki.newToday.value }}
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-rose-200">
                    Learn {{ anki.learnToday.value }}
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-emerald-200">
                    Due {{ anki.dueToday.value }}
                  </span>
                </div>

                <div v-if="anki.selectedDeck.value" class="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                  <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Deck aktif</p>
                  <div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <h3 class="text-lg font-black text-white">{{ anki.selectedDeck.value.name }}</h3>
                    <div class="flex flex-wrap gap-3 text-sm">
                      <span
                        v-for="item in selectedDeckStats"
                        :key="item.label"
                        class="font-semibold"
                        :class="item.tone"
                      >
                        {{ item.label }} {{ item.value }}
                      </span>
                    </div>
                  </div>
                  <p class="mt-2 text-sm text-gray-300/80">
                    Review berikutnya akan dimulai dari deck ini, dan pengaturan desain per-deck juga mengikuti pilihan aktif sekarang.
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <button
                  class="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/10 disabled:opacity-60"
                  :disabled="anki.isBridgeLoading.value"
                  @click="anki.refreshBridge"
                >
                  {{ anki.isBridgeLoading.value ? 'Memuat...' : 'Refresh Deck' }}
                </button>
                <button
                  class="ayumu-primary rounded-full bg-[#4f46e5] px-5 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#6366f1] disabled:opacity-60"
                  :disabled="!anki.reviewReady.value || !anki.selectedDeckId.value || anki.isReviewLoading.value"
                  @click="openReview"
                >
                  {{ anki.isReviewLoading.value ? 'Menyiapkan...' : 'Mulai Review' }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </section>
</template>

<style scoped>
.deck-browser-shell {
  background:
    linear-gradient(180deg, rgba(10, 10, 10, 0.62), rgba(10, 10, 10, 0.84)),
    linear-gradient(135deg, rgba(114, 122, 233, 0.18), rgba(24, 12, 44, 0.12));
}
</style>
