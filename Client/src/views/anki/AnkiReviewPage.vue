<script setup>
import { computed } from 'vue'
import AnkiDesktopMirrorCard from '../../components/AnkiDesktopMirrorCard.vue'
import { useAnkiWorkspace } from '../../composables/useAnkiWorkspace.js'

const anki = useAnkiWorkspace()

const failOption = computed(() => {
  const options = anki.activeCard.value?.available_ratings || []
  return options.find((option) => /ulang|again|fail/i.test(option.label)) || options[0] || null
})

const passOption = computed(() => {
  const options = anki.activeCard.value?.available_ratings || []
  return options.find((option) => /baik|good|pass/i.test(option.label))
    || options[options.length - 1]
    || null
})

async function startOrResumeReview() {
  await anki.startSelectedDeckReview()
}
</script>

<template>
  <section class="space-y-6">
    <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Halaman Review</p>
          <h2 class="mt-1 text-xl font-black text-gray-950 dark:text-white">Ruang fokus kartu</h2>
          <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">
            Review dipisah dari deck settings supaya kartu, jawaban, dan media punya ruang baca yang lebih nyaman.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <router-link
            to="/anki/decks"
            class="ayumu-secondary-button rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 transition-colors hover:bg-gray-50"
          >
            Kembali ke Deck
          </router-link>
        </div>
      </div>

      <div v-if="anki.reviewSummary.value" class="mt-5 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-500">
        <span class="rounded-full border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-[#101828] dark:text-gray-300">Dijawab {{ anki.reviewSummary.value.answered_count || 0 }}</span>
        <span class="rounded-full border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-[#101828] dark:text-gray-300">Baru {{ anki.reviewSummary.value.new_count || 0 }}</span>
        <span class="rounded-full border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-[#101828] dark:text-gray-300">Belajar {{ anki.reviewSummary.value.learn_count || 0 }}</span>
        <span class="rounded-full border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-[#101828] dark:text-gray-300">Due {{ anki.reviewSummary.value.due_count || 0 }}</span>
      </div>
    </section>

    <section v-if="!anki.reviewReady.value" class="rounded-[22px] border border-dashed border-gray-300 ayumu-panel px-5 py-10 text-center dark:border-gray-700">
      <h3 class="text-lg font-black text-gray-950 dark:text-white">Bridge desktop belum siap</h3>
      <p class="ayumu-soft-copy mt-3 text-sm text-gray-600 dark:text-gray-300">
        Buka Anki desktop dan koleksinya dulu, lalu hubungkan dari halaman Deck.
      </p>
      <router-link
        to="/anki/decks"
        class="ayumu-primary mt-5 inline-flex rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1]"
      >
        Buka Halaman Deck
      </router-link>
    </section>

    <section v-else-if="!anki.selectedDeckId.value" class="rounded-[22px] border border-dashed border-gray-300 ayumu-panel px-5 py-10 text-center dark:border-gray-700">
      <h3 class="text-lg font-black text-gray-950 dark:text-white">Pilih deck dulu</h3>
      <p class="ayumu-soft-copy mt-3 text-sm text-gray-600 dark:text-gray-300">
        Review page ini perlu deck aktif dari halaman Deck.
      </p>
      <router-link
        to="/anki/decks"
        class="ayumu-primary mt-5 inline-flex rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1]"
      >
        Pilih Deck
      </router-link>
    </section>

    <section v-else-if="!anki.activeCard.value" class="rounded-[22px] border border-dashed border-gray-300 ayumu-panel px-5 py-10 text-center dark:border-gray-700">
      <h3 class="text-lg font-black text-gray-950 dark:text-white">
        {{ anki.reviewSummary.value?.answered_count ? 'Sesi deck selesai untuk saat ini' : 'Belum ada kartu aktif' }}
      </h3>
      <p class="ayumu-soft-copy mt-3 text-sm text-gray-600 dark:text-gray-300">
        {{ anki.reviewSummary.value?.answered_count
          ? 'Kamu bisa mulai ulang deck ini untuk mengambil state scheduler terbaru dari Anki desktop.'
          : 'Tekan tombol di bawah untuk menarik kartu pertama dari deck terpilih.' }}
      </p>
      <div class="mt-5 flex flex-wrap justify-center gap-3">
        <button
          class="ayumu-primary rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1] disabled:opacity-60"
          :disabled="anki.isReviewLoading.value"
          @click="startOrResumeReview"
        >
          {{ anki.isReviewLoading.value ? 'Menyiapkan review...' : 'Mulai / Ulangi Review' }}
        </button>
        <router-link
          to="/anki/decks"
          class="ayumu-secondary-button rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-700 transition-colors hover:bg-gray-50"
        >
          Ganti Deck
        </router-link>
      </div>
    </section>

    <section v-else class="space-y-6">
      <AnkiDesktopMirrorCard
        :card="anki.activeCard.value"
        :deck-name="anki.selectedDeck.value?.name || ''"
        :bridge-base-url="anki.bridgeBaseUrl.value"
        :session-token="anki.sessionToken.value"
        :audio-autoplay="anki.audioAutoplayEnabled.value"
        :is-back-visible="anki.isBackVisible.value"
      />

      <div class="rounded-[20px] border border-gray-300 ayumu-panel px-4 py-4 sm:px-5">
        <div v-if="!anki.isBackVisible.value" class="flex flex-wrap items-center justify-between gap-3">
          <p class="ayumu-soft-copy text-sm text-gray-600 dark:text-gray-300">
            Ini memakai hasil render kartu dari Anki desktop user. Kalau note type punya CSS, script, dan asset custom, Ayumu akan mencoba menampilkannya langsung di sini.
          </p>
          <button
            class="ayumu-primary rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1] disabled:opacity-60"
            :disabled="anki.isReviewLoading.value"
            @click="anki.isBackVisible.value = true"
          >
            Balik Kartu
          </button>
        </div>

        <div v-else class="space-y-4">
          <p class="ayumu-soft-copy text-sm text-gray-600 dark:text-gray-300">
            Kontrol scheduler disederhanakan jadi mode 2 tombol: <strong>Fail</strong> dan <strong>Pass</strong>.
          </p>
          <div class="grid gap-3 md:grid-cols-2">
            <button
              v-if="failOption"
              class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4 text-left transition-colors hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:hover:border-rose-800 dark:hover:bg-rose-950/60"
              :disabled="anki.isReviewLoading.value"
              @click="anki.answerCard(failOption.value)"
            >
              <p class="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Scheduler</p>
              <p class="mt-2 text-base font-black text-rose-900 dark:text-rose-100">Fail</p>
              <p class="mt-1 text-xs font-bold text-rose-700 dark:text-rose-200">Kirim sebagai {{ failOption.label }}</p>
            </button>

            <button
              v-if="passOption"
              class="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/60"
              :disabled="anki.isReviewLoading.value"
              @click="anki.answerCard(passOption.value)"
            >
              <p class="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Scheduler</p>
              <p class="mt-2 text-base font-black text-emerald-900 dark:text-emerald-100">Pass</p>
              <p class="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-200">Kirim sebagai {{ passOption.label }}</p>
            </button>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>
