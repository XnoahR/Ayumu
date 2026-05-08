<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../store/session.js'
import AppHeader from '../components/AppHeader.vue'
import Toast from '../components/Toast.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const selectedLevel = ref('N5')
const isLoading = ref(false)
const toast = ref(null)

const levels = ['N5', 'N4', 'N3', 'N2', 'N1']

const menuItems = [
  {
    title: 'Kartu Anki',
    subtitle: 'Bridge Anki',
    body: 'Buka tampilan bergaya desktop untuk dek Anki lokalmu.',
    to: '/anki',
  },
  {
    title: 'Tulis Kanji',
    subtitle: 'Segera hadir',
    body: 'Ruang latihan menulis tangan akan hadir nanti.',
    disabled: true,
  },
  {
    title: 'Profil',
    subtitle: 'Statistik',
    body: 'Lihat progres, streak, dan detail akunmu.',
    to: '/profile',
  },
  {
    title: 'Peringkat',
    subtitle: 'Komunitas',
    body: 'Lihat siapa yang sedang naik dan bandingkan skor.',
    to: '/leaderboard',
  },
]

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

function openMenu(item) {
  if (item.disabled) return
  if (item.action === 'start') {
    startSession()
    return
  }
  if (item.to) {
    router.push(item.to)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 ayumu-page text-gray-900 dark:text-gray-100">
    <AppHeader />
    <Toast v-if="toast" :key="toast.key" :message="toast.message" :type="toast.type" />

    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <section class="rounded-[24px] border border-gray-200 ayumu-panel bg-white dark:bg-gray-800 p-6 sm:p-8">
        <div>
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 ayumu-accent-text">Menu Utama</p>
            <h1 class="mt-3 text-3xl sm:text-4xl font-black leading-tight text-gray-900 dark:text-white">
              Pilih menu lalu lanjut belajar.
            </h1>
            <p class="ayumu-soft-copy mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              Ayumu terasa lebih enak dipakai kalau tiap alat punya ruang sendiri. Mulai dari sini, lalu masuk ke halaman yang kamu butuhkan.
            </p>
          </div>
        </div>
      </section>

      <section class="mt-6 grid gap-4 md:grid-cols-2">
        <button
          v-for="item in menuItems"
          :key="item.title"
          @click="openMenu(item)"
          class="text-left rounded-[22px] border p-5 sm:p-6 transition-colors min-h-[220px] flex flex-col"
          :class="item.disabled
            ? 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 cursor-not-allowed'
            : 'border-gray-200 bg-white hover:bg-gray-50 ayumu-panel dark:bg-gray-800 dark:hover:bg-[#1d1b3d]'"
          :disabled="item.disabled || (item.action === 'start' && isLoading)"
        >
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">{{ item.subtitle }}</p>
          <h2 class="mt-3 text-xl font-black text-gray-900 dark:text-white">{{ item.title }}</h2>
          <p class="ayumu-soft-copy mt-3 text-sm text-gray-600 dark:text-gray-300">{{ item.body }}</p>
          <div class="mt-auto pt-5 text-[11px] font-black uppercase tracking-[0.16em] text-gray-900 ayumu-accent-text">
            {{ item.disabled ? 'Belum tersedia' : item.action === 'start' ? 'Mulai' : 'Buka' }}
          </div>
        </button>
      </section>

      <section class="mt-6 rounded-[22px] border border-gray-200 ayumu-note-surface bg-gray-50 p-5 sm:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Ujian Cepat</p>
            <h2 class="mt-3 text-2xl font-black text-gray-900 dark:text-white">Mulai sesi JLPT dengan cepat.</h2>
            <p class="ayumu-soft-copy mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              Pilih level lalu langsung masuk ke sesi latihan berwaktu.
            </p>
          </div>

          <div class="w-full lg:max-w-[420px]">
            <div class="grid grid-cols-5 gap-2 mb-3">
              <button
                v-for="level in levels"
                :key="level"
                @click="selectedLevel = level"
                class="rounded-xl py-2 text-xs font-black border transition-colors"
                :class="selectedLevel === level
                  ? 'bg-gray-900 text-white border-gray-900 ayumu-chip-active dark:bg-transparent'
                  : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700'"
              >
                {{ level }}
              </button>
            </div>
            <button
              @click="startSession"
              :disabled="isLoading"
              class="ayumu-primary w-full rounded-xl bg-gray-900 hover:bg-gray-800 text-white py-3 text-[11px] font-black uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
            >
              {{ isLoading ? 'Memulai...' : `Mulai ${selectedLevel}` }}
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
