<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <router-link
    :to="to"
    class="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-900"
  >
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-black tracking-tight text-slate-950 dark:text-white sm:text-xl">
        {{ title }}
      </h2>
      <span class="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition-all duration-300 group-hover:border-sky-200 group-hover:bg-sky-50 group-hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:group-hover:border-sky-900 dark:group-hover:bg-sky-950/50 dark:group-hover:text-sky-300">
        <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M9 7h8v8" />
        </svg>
      </span>
    </div>
    <p class="mt-3 pr-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
      {{ description }}
    </p>
    <div class="mt-auto pt-6">
      <div class="h-1.5 w-10 rounded-full bg-sky-500/70 transition-all duration-300 group-hover:w-16 dark:bg-sky-400/70"></div>
    </div>
  </router-link>
</template>
