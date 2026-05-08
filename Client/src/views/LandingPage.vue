<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import { useAuthStore } from '../store/auth.js'
import AppHeader from '../components/AppHeader.vue'
import Toast from '../components/Toast.vue'
import WelcomeHero from '../components/WelcomeHero.vue'
import QuickActionCard from '../components/QuickActionCard.vue'
import JlptLauncherCard from '../components/JlptLauncherCard.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const authStore = useAuthStore()
const selectedLevel = ref('N5')
const isLoading = ref(false)
const toast = ref(null)

const levels = ['N5', 'N4', 'N3', 'N2', 'N1']

const quickActions = [
  {
    title: 'Profile',
    description: 'Pantau progresmu dan pertahankan rekor belajarmu.',
    to: '/profile',
  },
  {
    title: 'Flashcard',
    description: 'Flashcard sedang disiapkan untuk sesi ulasan cepat.',
    to: '/flashcard',
  },
  {
    title: 'Kanji',
    description: 'Latihan Kanji akan segera hadir, dengan suasana belajar yang lebih tenang.',
    to: '/kanji',
  },
  {
    title: 'Leaderboard',
    description: 'Lihat pergerakan komunitas minggu ini.',
    to: '/leaderboard',
  },
]

const welcomeTitle = computed(() => {
  return authStore.discordUsername
    ? `Pilih menu lalu lanjut belajar, ${authStore.discordUsername}`
    : 'Pilih menu lalu lanjut belajar'
})

const showToast = (message, type = 'error') => {
  toast.value = { message, type, key: Date.now() }
}

async function startSession() {
  isLoading.value = true
  try {
    const data = await sessionStore.createSession(selectedLevel.value, 'balanced_75')
    router.push({ name: 'exam', params: { sessionCode: data.session_code } })
  } catch {
    showToast('Gagal memulai ujian. Coba lagi ya.')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="ayumu-page min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <AppHeader />
    <Toast v-if="toast" :key="toast.key" :message="toast.message" :type="toast.type" />

    <main class="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
      <WelcomeHero :title="welcomeTitle" subtitle="Ayumu terasa lebih enak dipakai kalau tiap alat punya ruang sendiri. mulai dari sini. lalu masuk ke halaman yang kamu butuhkan" />

      <section class="mt-5 grid gap-5 xl:grid-cols-[0.98fr_1.2fr]">
        <div class="grid grid-cols-2 gap-4">
          <QuickActionCard
            v-for="action in quickActions"
            :key="action.title"
            :title="action.title"
            :description="action.description"
            :to="action.to"
          />
        </div>

        <JlptLauncherCard
          v-model:selected-level="selectedLevel"
          :levels="levels"
          :is-loading="isLoading"
          @start="startSession"
        />
      </section>

      <footer class="mt-5">
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                Belajar bersama teman terasa lebih ringan.
              </h2>
              <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Bergabunglah dengan Discord untuk info terbaru, ngobrol santai seputar latihan, dan saling menyemangati.
              </p>
            </div>
            <!-- TODO: replace placeholder href with the final Discord invite URL if it changes. -->
            <a
              href="https://discord.gg/TH83fs3H38"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:border-sky-200 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-sky-900 dark:hover:text-sky-300"
            >
              Gabung Discord
            </a>
          </div>
        </section>
      </footer>
    </main>
  </div>
</template>
