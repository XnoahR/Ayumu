import { ref, watch } from 'vue'

const isDark = ref(false)

function loadTheme() {
  const saved = localStorage.getItem('ayumu_theme')
  isDark.value = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
  applyTheme()
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
}

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('ayumu_theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

watch(isDark, applyTheme)

export function useTheme() {
  return { isDark, toggleTheme }
}

export { loadTheme }
