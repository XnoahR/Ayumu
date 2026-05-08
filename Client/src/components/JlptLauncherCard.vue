<script setup>
const props = defineProps({
  levels: {
    type: Array,
    required: true,
  },
  selectedLevel: {
    type: String,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:selectedLevel', 'start'])

function selectLevel(level) {
  emit('update:selectedLevel', level)
}
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7"
  >
    <div class="flex h-full flex-col">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-sky-700 dark:text-sky-300">
            JLPT Launcher
          </p>
          <h2 class="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Pilih level dan mulai latihan fokus.
          </h2>
          <p class="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Sesi 75 pertanyaan yang rapi untuk level yang ingin kamu kerjakan hari ini. Tanpa ribet, langsung gas.
          </p>
        </div>
      </div>

      <div class="mt-8 grid grid-cols-5 gap-2.5">
        <button
          v-for="level in props.levels"
          :key="level"
          @click="selectLevel(level)"
          class="min-h-16 rounded-2xl border px-2 py-3 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/30 sm:min-h-20 sm:px-4 sm:py-4"
          :class="selectedLevel === level
            ? 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/45 dark:text-sky-100'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600'"
        >
          <span class="block text-xs font-semibold text-slate-500 dark:text-slate-400">Level</span>
          <span class="mt-1 block text-lg font-black sm:text-xl">{{ level }}</span>
        </button>
      </div>

      <div class="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <p class="max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          Jawabanmu otomatis tersimpan selama mengerjakan, jadi kamu bisa tetap fokus pada pertanyaan.
        </p>
        <button
          @click="$emit('start')"
          :disabled="isLoading"
          class="ayumu-primary inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
        >
          {{ isLoading ? 'Memulai...' : 'Mulai' }}
        </button>
      </div>
    </div>
  </section>
</template>
