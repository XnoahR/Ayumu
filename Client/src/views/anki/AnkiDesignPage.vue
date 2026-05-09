<script setup>
import { REVIEW_THEMES } from '../../lib/ankiReviewPlugins.js'
import AnkiDesktopMirrorCard from '../../components/AnkiDesktopMirrorCard.vue'
import { useAnkiWorkspace } from '../../composables/useAnkiWorkspace.js'

const anki = useAnkiWorkspace()
</script>

<template>
  <section class="space-y-6">
    <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
      <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Card Design</p>
      <h2 class="mt-1 text-xl font-black text-gray-950 dark:text-white">Bridge mirror dan fallback design</h2>
      <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">
        Arah utama sekarang adalah mengikuti template desktop Anki user. Opsi di bawah tetap disimpan sebagai fallback kalau ada note type yang tidak terender rapi.
      </p>
    </section>

    <section class="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside class="space-y-5">
        <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Theme aktif</p>
          <div class="mt-4 space-y-3">
            <button
              v-for="theme in REVIEW_THEMES"
              :key="theme.id"
              type="button"
              class="w-full rounded-[18px] border px-4 py-4 text-left transition-colors"
              :class="anki.preferenceDraft.value.active_theme === theme.id
                ? 'ayumu-highlight-surface border-[#2d2c58] bg-[#16142f] text-white'
                : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#101828] dark:text-gray-100 dark:hover:bg-[#18202a]'"
              @click="anki.preferenceDraft.value.active_theme = theme.id"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-black">{{ theme.name }}</p>
                  <p class="mt-1 text-sm opacity-80">{{ theme.description }}</p>
                </div>
                <span class="h-3 w-3 rounded-full" :class="theme.accentClass"></span>
              </div>
            </button>
          </div>
        </section>

        <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
          <div>
            <label class="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Model catatan</label>
            <select
              v-model="anki.selectedModelId.value"
              class="mapping-select"
            >
              <option value="" disabled>Pilih model Anki</option>
              <option v-for="model in anki.models.value" :key="model.id" :value="String(model.id)">
                {{ model.name }}
              </option>
            </select>
          </div>

          <label class="mt-4 flex items-center gap-3 rounded-[18px] border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-[#101828]">
            <input
              v-model="anki.useDeckOverride.value"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span class="text-sm font-bold text-gray-700 dark:text-gray-200">Gunakan mapping khusus untuk deck yang sedang dipilih</span>
          </label>

          <div class="mt-4 grid gap-4">
            <div>
              <label class="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Field depan</label>
              <select v-model="anki.mappingForm.value.front_field" class="mapping-select">
                <option value="">Pilih field</option>
                <option v-for="field in anki.currentModelFields.value" :key="field.name" :value="field.name">{{ field.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Field belakang</label>
              <select v-model="anki.mappingForm.value.back_field" class="mapping-select">
                <option value="">Pilih field</option>
                <option v-for="field in anki.currentModelFields.value" :key="field.name" :value="field.name">{{ field.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Field petunjuk</label>
              <select v-model="anki.mappingForm.value.hint_field" class="mapping-select">
                <option value="">Tidak dipakai</option>
                <option v-for="field in anki.currentModelFields.value" :key="field.name" :value="field.name">{{ field.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Field audio</label>
              <select v-model="anki.mappingForm.value.audio_field" class="mapping-select">
                <option value="">Tidak dipakai</option>
                <option v-for="field in anki.currentModelFields.value" :key="field.name" :value="field.name">{{ field.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Field gambar</label>
              <select v-model="anki.mappingForm.value.image_field" class="mapping-select">
                <option value="">Tidak dipakai</option>
                <option v-for="field in anki.currentModelFields.value" :key="field.name" :value="field.name">{{ field.name }}</option>
              </select>
            </div>
          </div>

          <div class="mt-4 space-y-3 rounded-[18px] border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-[#101828]">
            <label class="flex items-center gap-3">
              <input v-model="anki.mappingForm.value.show_tags" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span class="text-sm font-bold text-gray-700 dark:text-gray-200">Tampilkan tag di footer kartu</span>
            </label>
            <label class="flex items-center gap-3">
              <input v-model="anki.mappingForm.value.show_hint_before_flip" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span class="text-sm font-bold text-gray-700 dark:text-gray-200">Izinkan hint sebelum kartu dibalik</span>
            </label>
          </div>

          <button
            class="ayumu-primary mt-5 w-full rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1] disabled:opacity-60"
            :disabled="anki.saveDisabled.value"
            @click="anki.savePreferencesState"
          >
            {{ anki.isSavingPreferences.value ? 'Menyimpan...' : 'Simpan Card Design' }}
          </button>
        </section>
      </aside>

      <section class="space-y-5">
        <div v-if="anki.activeCard.value" class="rounded-[22px] border border-gray-300 ayumu-panel p-4 sm:p-5">
          <AnkiDesktopMirrorCard
            :card="anki.activeCard.value"
            :deck-name="anki.selectedDeck.value?.name || ''"
            :bridge-base-url="anki.bridgeBaseUrl.value"
            :is-back-visible="true"
          />
        </div>

        <section v-else class="rounded-[22px] border border-dashed border-gray-300 ayumu-panel px-5 py-10 text-center dark:border-gray-700">
          <h3 class="text-lg font-black text-gray-950 dark:text-white">Preview desain mengikuti kartu aktif</h3>
          <p class="ayumu-soft-copy mt-3 text-sm text-gray-600 dark:text-gray-300">
            Mulai satu sesi review dulu supaya halaman ini bisa menampilkan preview kartu nyata dari koleksi Anki-mu.
          </p>
          <router-link
            to="/anki/review"
            class="ayumu-primary mt-5 inline-flex rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1]"
          >
            Buka Halaman Review
          </router-link>
        </section>
      </section>
    </section>
  </section>
</template>

<style scoped>
.mapping-select {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgb(209 213 219);
  background: white;
  padding: 0.8rem 0.9rem;
  font-size: 0.95rem;
  color: rgb(31 41 55);
  outline: none;
  transition: border-color 0.2s ease;
}

.mapping-select:focus {
  border-color: rgb(99 102 241);
}

:global(.dark) .mapping-select {
  border-color: #354052;
  background: #101828;
  color: white;
}
</style>
