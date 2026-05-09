<script setup>
import { useAnkiWorkspace } from '../../composables/useAnkiWorkspace.js'

const anki = useAnkiWorkspace()

function formatCreatedAt(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('id-ID')
  } catch {
    return value
  }
}
</script>

<template>
  <section class="space-y-6">
    <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
      <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Pengaturan Lokal</p>
      <h2 class="mt-1 text-xl font-black text-gray-950 dark:text-white">Kontrol review, addon, dan import manual</h2>
      <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">
        Tab ini menyimpan pengaturan lokal khusus area Anki Ayumu. Toggle audio autoplay langsung memengaruhi halaman review, sementara addon manual dan import manual berfungsi sebagai registry lokal yang mudah dicek kembali.
      </p>
    </section>

    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section class="space-y-6">
        <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Audio Review</p>
              <h3 class="mt-1 text-lg font-black text-gray-950 dark:text-white">Auto play audio</h3>
              <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">
                Saat aktif, Ayumu akan mencoba memutar audio pertama yang tersedia setiap kali kartu review dimuat di mirror Anki desktop.
              </p>
            </div>
            <button
              type="button"
              class="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-colors"
              :class="anki.audioAutoplayEnabled.value
                ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70'
                : 'ayumu-secondary-button border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
              @click="anki.toggleAudioAutoplay"
            >
              {{ anki.audioAutoplayEnabled.value ? 'Auto play aktif' : 'Auto play nonaktif' }}
            </button>
          </div>
        </section>

        <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Addon Manual</p>
          <h3 class="mt-1 text-lg font-black text-gray-950 dark:text-white">Daftar addon desktop yang ingin dicatat</h3>
          <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">
            Ini belum meng-install addon ke Anki desktop secara otomatis. Fungsinya sekarang sebagai daftar lokal agar setup addon pribadi kamu tetap terdokumentasi di Ayumu.
          </p>

          <div class="mt-5 grid gap-3 md:grid-cols-2">
            <label class="space-y-2">
              <span class="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Nama addon</span>
              <input
                v-model="anki.manualAddonForm.value.name"
                type="text"
                class="w-full rounded-[16px] border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#727ae9] dark:border-gray-700 dark:bg-[#141921] dark:text-gray-100"
                placeholder="Contoh: AJT Japanese"
              >
            </label>

            <label class="space-y-2">
              <span class="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Sumber / URL</span>
              <input
                v-model="anki.manualAddonForm.value.source"
                type="text"
                class="w-full rounded-[16px] border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#727ae9] dark:border-gray-700 dark:bg-[#141921] dark:text-gray-100"
                placeholder="https://ankiweb.net/shared/info/..."
              >
            </label>

            <label class="space-y-2 md:col-span-2">
              <span class="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Catatan</span>
              <textarea
                v-model="anki.manualAddonForm.value.notes"
                rows="3"
                class="w-full rounded-[16px] border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#727ae9] dark:border-gray-700 dark:bg-[#141921] dark:text-gray-100"
                placeholder="Tambahkan catatan kecil tentang fungsi addon ini."
              />
            </label>
          </div>

          <div class="mt-4 flex justify-end">
            <button
              type="button"
              class="ayumu-primary rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1]"
              @click="anki.addManualAddon"
            >
              Tambah Addon Manual
            </button>
          </div>

          <div class="mt-5 space-y-3">
            <div
              v-for="addon in anki.localSettings.value.manualAddons"
              :key="addon.id"
              class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <h4 class="text-sm font-black text-gray-900 dark:text-gray-100">{{ addon.name }}</h4>
                  <p v-if="addon.source" class="mt-1 break-all text-xs text-indigo-600 dark:text-indigo-300">{{ addon.source }}</p>
                  <p v-if="addon.notes" class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">{{ addon.notes }}</p>
                  <p class="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Dicatat {{ formatCreatedAt(addon.createdAt) }}</p>
                </div>
                <button
                  type="button"
                  class="rounded-full bg-rose-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
                  @click="anki.removeManualAddon(addon.id)"
                >
                  Hapus
                </button>
              </div>
            </div>

            <div
              v-if="!anki.localSettings.value.manualAddons.length"
              class="rounded-[18px] border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
            >
              Belum ada addon manual yang dicatat.
            </div>
          </div>
        </section>
      </section>

      <section class="space-y-6">
        <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Import Manual</p>
          <h3 class="mt-1 text-lg font-black text-gray-950 dark:text-white">Catat import kartu yang ingin dilakukan</h3>
          <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">
            Mode ini membantu kamu menyiapkan daftar import card secara manual. Belum mengirim file ke Anki desktop, tapi sudah jadi panel kerja yang rapi untuk deck tujuan dan sumbernya.
          </p>

          <div class="mt-5 space-y-3">
            <label class="space-y-2">
              <span class="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Judul import</span>
              <input
                v-model="anki.manualImportForm.value.title"
                type="text"
                class="w-full rounded-[16px] border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#727ae9] dark:border-gray-700 dark:bg-[#141921] dark:text-gray-100"
                placeholder="Contoh: Mining cards minggu ini"
              >
            </label>

            <label class="space-y-2">
              <span class="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Deck tujuan</span>
              <input
                v-model="anki.manualImportForm.value.deckName"
                type="text"
                class="w-full rounded-[16px] border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#727ae9] dark:border-gray-700 dark:bg-[#141921] dark:text-gray-100"
                placeholder="Contoh: JP Mining"
              >
            </label>

            <label class="space-y-2">
              <span class="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Sumber file / catatan sumber</span>
              <input
                v-model="anki.manualImportForm.value.source"
                type="text"
                class="w-full rounded-[16px] border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#727ae9] dark:border-gray-700 dark:bg-[#141921] dark:text-gray-100"
                placeholder="CSV, TSV, spreadsheet, atau catatan sumber lain"
              >
            </label>

            <label class="space-y-2">
              <span class="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Catatan import</span>
              <textarea
                v-model="anki.manualImportForm.value.notes"
                rows="4"
                class="w-full rounded-[16px] border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#727ae9] dark:border-gray-700 dark:bg-[#141921] dark:text-gray-100"
                placeholder="Contoh: mapping field, tag yang ingin dipakai, atau sumber batch kartu."
              />
            </label>
          </div>

          <div class="mt-4 flex justify-end">
            <button
              type="button"
              class="ayumu-primary rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1]"
              @click="anki.addManualImport"
            >
              Tambah Import Manual
            </button>
          </div>
        </section>

        <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Daftar Import</p>
          <div class="mt-4 space-y-3">
            <div
              v-for="entry in anki.localSettings.value.manualImports"
              :key="entry.id"
              class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <h4 class="text-sm font-black text-gray-900 dark:text-gray-100">{{ entry.title }}</h4>
                  <p v-if="entry.deckName" class="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Deck tujuan: {{ entry.deckName }}</p>
                  <p v-if="entry.source" class="mt-2 break-all text-xs text-indigo-600 dark:text-indigo-300">{{ entry.source }}</p>
                  <p v-if="entry.notes" class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">{{ entry.notes }}</p>
                  <p class="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Dicatat {{ formatCreatedAt(entry.createdAt) }}</p>
                </div>
                <button
                  type="button"
                  class="rounded-full bg-rose-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
                  @click="anki.removeManualImport(entry.id)"
                >
                  Hapus
                </button>
              </div>
            </div>

            <div
              v-if="!anki.localSettings.value.manualImports.length"
              class="rounded-[18px] border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
            >
              Belum ada daftar import kartu manual.
            </div>
          </div>
        </section>
      </section>
    </section>
  </section>
</template>
