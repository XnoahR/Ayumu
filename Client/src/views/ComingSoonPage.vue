<script setup>
import AppHeader from '../components/AppHeader.vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: 'This area is being shaped for a future Ayumu release.',
  },
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <AppHeader />

    <main class="mx-auto flex max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <section class="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <p class="text-sm font-semibold text-sky-700 dark:text-sky-300">
          Coming Soon
        </p>
        <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          {{ title }}
        </h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
          {{ description }}
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <router-link
            to="/"
            class="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            Back Home
          </router-link>
          <router-link
            to="/profile"
            class="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Open Profile
          </router-link>
        </div>
      </section>
    </main>
  </div>
</template>
