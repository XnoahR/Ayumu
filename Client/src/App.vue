<script setup>
import { examStore } from './store/exam.js'
import { onMounted } from 'vue'

onMounted(() => {
  // Initialize the theme on application load
  examStore.setTheme(examStore.activeTheme)
})
</script>

<template>
  <router-view></router-view>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

:root {
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

[lang="ja"], .text-2xl, .text-3xl, .text-4xl, .text-5xl {
  font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Helvetica Neue", Arial, Meiryo, sans-serif;
  font-weight: 700;
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

span.underline {
  background: linear-gradient(120deg, rgba(var(--color-primary-500), 0.1) 0%, rgba(var(--color-primary-500), 0.1) 100%);
  background-repeat: no-repeat;
  background-size: 100% 0.4em;
  background-position: 0 88%;
}

::selection {
  background: var(--color-primary-300);
  color: inherit;
}
</style>
