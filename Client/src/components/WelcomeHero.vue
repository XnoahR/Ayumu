<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
  >
    <div class="flex min-h-[178px] flex-col justify-center sm:min-h-[210px]">
      <p class="text-sm font-semibold text-sky-700 dark:text-sky-300">
        Menu utama
      </p>
      <h1 class="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl">
        {{ title }}
      </h1>
      <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
        {{ subtitle }}
      </p>
    </div>
  </section>
</template>
