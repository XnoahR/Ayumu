<script setup>
import AppHeader from '../components/AppHeader.vue'
import AnkiBridgePanel from '../components/AnkiBridgePanel.vue'

const installSteps = [
  'Letakkan add-on ayumu_bridge di dalam addons21.',
  'Mulai ulang Anki lalu buka koleksimu.',
  'Kembali ke sini lalu muat ulang bridge.',
]
</script>

<template>
  <div class="min-h-screen bg-[#ececec] ayumu-page text-gray-900 dark:text-gray-100">
    <AppHeader />

    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div class="mb-4 flex items-center justify-between gap-4">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Kartu Anki</p>
          <h1 class="mt-1 text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Bridge Desktop Anki</h1>
        </div>
        <router-link
          to="/"
          class="ayumu-secondary-button px-4 py-2 rounded-full border border-gray-300 bg-white text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Kembali
        </router-link>
      </div>

      <section class="rounded-[18px] border border-gray-300 ayumu-panel bg-[#f8f8f8] dark:bg-gray-800 overflow-hidden">
        <div class="border-b border-gray-300 dark:border-gray-700 bg-[#e7e7e7] dark:bg-gray-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Tampilan Saat Ini</p>
            <p class="text-sm font-bold text-gray-800 dark:text-gray-100">Browser Dek</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a
              href="https://discord.gg/TH83fs3H38"
              target="_blank"
              rel="noreferrer"
              class="ayumu-primary px-3 py-2 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11px] font-black uppercase tracking-[0.14em] transition-colors"
            >
              PhiliaSpace
            </a>
            <div class="ayumu-note-surface px-3 py-2 rounded-md border border-gray-300 bg-white text-[11px] font-bold text-gray-600 dark:text-gray-300">
              Hanya lokal
            </div>
          </div>
        </div>

        <div class="grid gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside class="border-r border-gray-300 dark:border-gray-700 bg-[#f1f1f1] ayumu-note-surface p-4">
            <h2 class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text mb-3">Checklist Instalasi</h2>
            <div class="space-y-3">
              <div v-for="(step, index) in installSteps" :key="step" class="flex items-start gap-3">
                <div class="w-6 h-6 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-[11px] font-black text-gray-700 dark:text-gray-200 shrink-0">
                  {{ index + 1 }}
                </div>
                <p class="ayumu-soft-copy text-sm text-gray-600 dark:text-gray-300">{{ step }}</p>
              </div>
            </div>
          </aside>

          <div class="p-4 sm:p-5">
            <AnkiBridgePanel />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
