<script setup>
import { ref, onMounted } from 'vue'
import HelloWorld from './components/HelloWorld.vue'

const message = ref('Welcome to Ayumu!')
const apiResponse = ref('')

onMounted(async () => {
  try {
    const response = await fetch('/api/health')
    const data = await response.json()
    apiResponse.value = data.message
  } catch (error) {
    apiResponse.value = 'Failed to connect to server'
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
      <h1 class="text-3xl font-bold text-gray-800 mb-4">{{ message }}</h1>
      <HelloWorld msg="Vue 3 + Vite + Tailwind CSS" />
      <p class="mt-4 text-gray-600">Server Status: {{ apiResponse }}</p>
    </div>
  </div>
</template>
