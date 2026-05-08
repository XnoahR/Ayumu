<script setup>
import { useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme.js'
import { useAuthStore } from '../store/auth.js'

const route = useRoute()
const authStore = useAuthStore()
const { isDark, toggleTheme } = useTheme()

const navItems = [
  { label: 'Beranda', to: '/' },
  { label: 'Kartu Anki', to: '/anki' },
  { label: 'Peringkat', to: '/leaderboard' },
  { label: 'Profil', to: '/profile' },
]

async function signOut() {
  try {
    await authStore.signOut()
  } catch {}
}

function isActive(path) {
  return route.path === path
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-gray-200/80 dark:border-gray-700 bg-white/90 dark:bg-gray-900/95 backdrop-blur">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      <div class="flex items-center gap-4 min-w-0">
        <router-link to="/" class="text-sm font-black tracking-[0.18em] uppercase text-gray-900 dark:text-white shrink-0">
          Ayumu
        </router-link>
        <nav class="hidden md:flex items-center gap-1">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-3 py-1.5 rounded-full border border-transparent text-[11px] font-black uppercase tracking-[0.14em] transition-colors"
            :class="isActive(item.to)
              ? 'bg-gray-900 text-white ayumu-nav-active'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 dark:hover:border-gray-700'"
          >
            {{ item.label }}
          </router-link>
          <a
            href="https://discord.gg/TH83fs3H38"
            target="_blank"
            rel="noreferrer"
            class="px-3 py-1.5 rounded-full border border-transparent text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 dark:hover:border-gray-700 transition-colors"
          >
            PhiliaSpace
          </a>
        </nav>
      </div>

      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          @click="toggleTheme"
          class="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-gray-500 hover:text-gray-900 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-600 transition-colors flex items-center justify-center"
          :title="isDark ? 'Mode terang' : 'Mode gelap'"
        >
          <svg v-if="isDark" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
          </svg>
        </button>

        <template v-if="authStore.isAuthenticated">
          <router-link to="/profile" class="hidden sm:flex items-center gap-2 hover:opacity-85 transition-opacity">
            <img v-if="authStore.discordAvatar" :src="authStore.discordAvatar" class="w-8 h-8 rounded-full" />
            <span class="text-xs font-bold text-gray-600 dark:text-gray-300 truncate max-w-[140px]">{{ authStore.discordUsername }}</span>
          </router-link>
          <button
            @click="signOut"
            class="px-3 py-2 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60 text-[11px] font-black uppercase tracking-[0.14em] transition-colors"
          >
            Keluar
          </button>
        </template>
        <template v-else>
          <button
            @click="authStore.signInWithDiscord().catch(() => {})"
            class="px-3 py-2 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white text-[11px] font-black uppercase tracking-[0.14em] transition-colors"
          >
            Masuk
          </button>
        </template>
      </div>
    </div>

    <div class="md:hidden px-4 sm:px-6 pb-3 flex items-center gap-2 overflow-auto no-scrollbar">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="px-3 py-1.5 rounded-full whitespace-nowrap border border-transparent text-[11px] font-black uppercase tracking-[0.14em] transition-colors"
        :class="isActive(item.to)
          ? 'bg-gray-900 text-white ayumu-nav-active'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'"
      >
        {{ item.label }}
      </router-link>
      <a
        href="https://discord.gg/TH83fs3H38"
        target="_blank"
        rel="noreferrer"
        class="px-3 py-1.5 rounded-full whitespace-nowrap border border-gray-200 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 text-[11px] font-black uppercase tracking-[0.14em]"
      >
        PhiliaSpace
      </a>
    </div>
  </header>
</template>
