<script setup>
import { ref } from 'vue'

defineProps({
  msg: String,
})

const count = ref(0)
</script>

<template>
  <div class="mt-4">
    <p class="text-lg text-indigo-600 font-semibold">{{ msg }}</p>
    <button
      @click="count++"
      class="mt-2 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
    >
      Count: {{ count }}
    </button>
  </div>
</template>
