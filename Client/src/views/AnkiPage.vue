<script setup>
import { onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import Toast from '../components/Toast.vue'
import { useAnkiWorkspace } from '../composables/useAnkiWorkspace.js'

const route = useRoute()
const anki = useAnkiWorkspace()

const navItems = [
  { label: 'Deck', to: '/anki/decks' },
  { label: 'Plugin', to: '/anki/plugins' },
  { label: 'Card Design', to: '/anki/design' },
  { label: 'Pengaturan', to: '/anki/settings' },
  { label: 'Akun', to: '/anki/account' },
]

function isActive(path) {
  return route.path === path
}

onMounted(() => {
  anki.initialize()
})
</script>

<template>
  <div class="min-h-screen bg-[#ececec] ayumu-page text-gray-900 dark:text-gray-100">
    <AppHeader />
    <Toast
      v-if="anki.toast.value"
      :key="anki.toast.value.key"
      :message="anki.toast.value.message"
      :type="anki.toast.value.type"
    />

    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Flashcard Anki</p>
          <h1 class="mt-1 text-2xl font-black text-gray-950 dark:text-white sm:text-3xl">Workspace Anki Ayumu</h1>
          <p class="ayumu-soft-copy mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Area Anki sekarang dipisah per fungsi, jadi deck management, plugin, desain kartu, dan review bisa terasa lebih lapang.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <router-link
            to="/anki/review"
            class="ayumu-primary rounded-full bg-[#4f46e5] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#6366f1]"
          >
            Halaman Review
          </router-link>
          <router-link
            to="/"
            class="ayumu-secondary-button rounded-full border border-gray-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 transition-colors hover:bg-gray-50"
          >
            Kembali
          </router-link>
        </div>
      </div>

      <section class="mb-6 rounded-[22px] border border-gray-300 ayumu-panel px-4 py-4 sm:px-5">
        <div class="flex flex-wrap items-center gap-2">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-colors"
            :class="isActive(item.to)
              ? 'ayumu-highlight-surface border-[#2d2c58] bg-[#16142f] text-white'
              : 'ayumu-secondary-button border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
          >
            {{ item.label }}
          </router-link>

          <router-link
            to="/anki/review"
            class="rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-colors"
            :class="isActive('/anki/review')
              ? 'ayumu-highlight-surface border-[#2d2c58] bg-[#16142f] text-white'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70'"
          >
            Review
          </router-link>
        </div>
      </section>

      <RouterView />
    </main>
  </div>
</template>
