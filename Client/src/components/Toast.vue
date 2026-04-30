<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  message: String,
  type: { type: String, default: 'info' },
  duration: { type: Number, default: 4000 },
})

const visible = ref(false)

const icons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

onMounted(() => {
  visible.value = true
  if (props.duration > 0) {
    setTimeout(() => {
      visible.value = false
    }, props.duration)
  }
})
</script>

<template>
  <Transition name="toast">
    <div v-if="visible" class="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border"
      :class="{
        'bg-emerald-50 border-emerald-200 text-emerald-800': type === 'success',
        'bg-red-50 border-red-200 text-red-800': type === 'error',
        'bg-blue-50 border-blue-200 text-blue-800': type === 'info',
        'bg-yellow-50 border-yellow-200 text-yellow-800': type === 'warning',
      }"
    >
      <span class="text-lg font-bold">{{ icons[type] || icons.info }}</span>
      <span class="text-sm font-medium">{{ message }}</span>
      <button @click="visible = false" class="ml-2 opacity-50 hover:opacity-100 transition-opacity">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateY(-10px); }
.toast-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
