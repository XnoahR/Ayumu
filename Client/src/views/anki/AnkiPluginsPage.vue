<script setup>
import { REVIEW_PLUGINS } from '../../lib/ankiReviewPlugins.js'
import { useAnkiWorkspace } from '../../composables/useAnkiWorkspace.js'

const anki = useAnkiWorkspace()
</script>

<template>
  <section class="space-y-6">
    <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
      <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Plugin / Addon</p>
      <h2 class="mt-1 text-xl font-black text-gray-950 dark:text-white">Katalog plugin bawaan Ayumu</h2>
      <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">
        Di fase ini user hanya mengaktifkan plugin layout bawaan. Tidak ada upload plugin custom, jadi perilaku review tetap aman.
      </p>
    </section>

    <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
      <div class="grid gap-4 xl:grid-cols-2">
        <label
          v-for="plugin in REVIEW_PLUGINS"
          :key="plugin.id"
          class="flex items-start gap-3 rounded-[20px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700"
        >
          <input
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            :checked="anki.enabledPluginIds.value.includes(plugin.id)"
            @change="anki.togglePlugin(plugin.id)"
          />
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-black text-gray-950 dark:text-white">{{ plugin.name }}</p>
              <span class="rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 dark:border-gray-700 dark:bg-[#101828] dark:text-gray-300">
                {{ plugin.type }}
              </span>
            </div>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ plugin.description }}</p>
          </div>
        </label>
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-gray-200 ayumu-note-surface px-4 py-4 dark:border-gray-700">
        <p class="ayumu-soft-copy text-sm text-gray-600 dark:text-gray-300">
          Plugin aktif saat ini: <strong>{{ anki.enabledPluginIds.value.join(', ') || 'tidak ada' }}</strong>
        </p>
        <button
          class="ayumu-primary rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1] disabled:opacity-60"
          :disabled="anki.isSavingPreferences.value"
          @click="anki.savePreferencesState"
        >
          {{ anki.isSavingPreferences.value ? 'Menyimpan...' : 'Simpan Plugin Aktif' }}
        </button>
      </div>
    </section>
  </section>
</template>
