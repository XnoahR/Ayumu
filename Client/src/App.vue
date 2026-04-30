<script setup>
import { onMounted } from 'vue'
import { loadTheme } from './composables/useTheme.js'

onMounted(() => {
  loadTheme()
})
</script>

<template>
  <router-view></router-view>
</template>

<style>
:root {
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

::selection {
  background: #d1d5db;
  color: inherit;
}
</style>
