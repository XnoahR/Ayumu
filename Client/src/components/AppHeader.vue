<script setup>
import { useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme.js'
import { useAuthStore } from '../store/auth.js'

const route = useRoute()
const authStore = useAuthStore()
const { isDark, toggleTheme } = useTheme()

const navItems = [
  { label: 'Profil', to: '/profile' },
  { label: 'Anki', to: '/anki' },
  { label: 'Peringkat', to: '/leaderboard' },
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
  <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <div class="flex min-w-0 items-center gap-4">
        <router-link
          to="/"
          class="shrink-0 rounded-full px-2.5 py-1.5 text-sm font-black tracking-normal text-slate-950 transition-colors hover:bg-slate-100 dark:text-white dark:hover:bg-slate-900"
          :class="isActive('/') ? 'bg-slate-100 dark:bg-slate-900' : ''"
        >
          AYUMU <span class="font-semibold text-slate-500 dark:text-slate-400">(Beranda)</span>
        </router-link>
        <nav class="hidden items-center gap-1.5 md:flex">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            :class="isActive(item.to)
              ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200'
              : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'"
          >
            {{ item.label }}
          </router-link>
        </nav>
      </div>

      <div class="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          @click="toggleTheme"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
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
          <router-link to="/profile" class="hidden items-center gap-2 transition-opacity hover:opacity-85 sm:flex">
            <img v-if="authStore.discordAvatar" :src="authStore.discordAvatar" class="h-8 w-8 rounded-full ring-1 ring-slate-200 dark:ring-slate-700" />
            <span class="max-w-[140px] truncate text-xs font-bold text-slate-600 dark:text-slate-300">{{ authStore.discordUsername }}</span>
          </router-link>
          <button
            @click="signOut"
            class="rounded-full bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/25 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/60"
          >
            Keluar
          </button>
        </template>
        <template v-else>
          <button
            @click="authStore.signInWithDiscord().catch(() => {})"
            class="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            Masuk
          </button>
        </template>
      </div>
    </div>

    <div class="no-scrollbar flex items-center gap-2 overflow-auto px-4 pb-3 sm:px-6 md:hidden">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        :class="isActive(item.to)
          ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200'
          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'"
      >
        {{ item.label }}
      </router-link>
    </div>
  </header>
</template>
