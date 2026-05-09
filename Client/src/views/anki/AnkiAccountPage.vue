<script setup>
import { useAuthStore } from '../../store/auth.js'
import { useAnkiWorkspace } from '../../composables/useAnkiWorkspace.js'

const authStore = useAuthStore()
const anki = useAnkiWorkspace()

async function signOut() {
  try {
    await authStore.signOut()
    anki.showToast('Berhasil keluar dari akun Ayumu.', 'success')
  } catch {
    anki.showToast('Gagal keluar dari akun Ayumu.')
  }
}
</script>

<template>
  <section class="space-y-6">
    <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
      <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Setting Akun</p>
      <h2 class="mt-1 text-xl font-black text-gray-950 dark:text-white">Identitas dan penyimpanan preferensi</h2>
      <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">
        Halaman ini fokus ke akun Ayumu, status backend preferensi, dan sesi bridge yang sedang dipakai area Anki.
      </p>
    </section>

    <section class="grid gap-6 xl:grid-cols-2">
      <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
        <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Akun Ayumu</p>
        <div class="mt-4 space-y-4">
          <div class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700">
            <p class="text-sm font-bold text-gray-800 dark:text-gray-100">
              {{ authStore.isAuthenticated ? 'Kamu sedang masuk dengan Discord.' : 'Kamu belum masuk ke akun Ayumu.' }}
            </p>
            <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">
              {{ authStore.isAuthenticated
                ? 'Preferensi desain dan plugin bisa ditautkan langsung ke akun ini.'
                : 'Ayumu tetap bisa dipakai, tapi mode akun penuh lebih enak untuk menyimpan preferensi jangka panjang.' }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              v-if="!authStore.isAuthenticated"
              class="ayumu-primary rounded-full bg-[#4f46e5] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6366f1]"
              @click="authStore.signInWithDiscord().catch(() => anki.showToast('Gagal masuk dengan Discord.'))"
            >
              Masuk dengan Discord
            </button>
            <button
              v-else
              class="rounded-full bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
              @click="signOut"
            >
              Keluar
            </button>
          </div>
        </div>
      </section>

      <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
        <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Storage Review</p>
        <div class="mt-4 space-y-4">
          <div class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700">
            <p class="text-sm font-bold text-gray-800 dark:text-gray-100">
              {{ anki.storageReady.value ? 'Backend preferensi siap dipakai.' : 'Backend preferensi belum siap penuh.' }}
            </p>
            <p class="ayumu-soft-copy mt-2 text-sm text-gray-600 dark:text-gray-300">{{ anki.backendMessage.value }}</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700">
              <p class="text-xl font-black text-gray-950 dark:text-white">{{ anki.preferenceDraft.value.active_theme }}</p>
              <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Theme aktif</p>
            </div>
            <div class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700">
              <p class="text-xl font-black text-gray-950 dark:text-white">{{ Object.keys(anki.preferenceDraft.value.model_preferences || {}).length }}</p>
              <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Mapping model</p>
            </div>
          </div>
        </div>
      </section>
    </section>

    <section class="rounded-[22px] border border-gray-300 ayumu-panel px-4 py-5 sm:px-5">
      <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 ayumu-accent-text">Bridge Session</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700">
          <p class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ anki.bridgeHealth.value?.profile_name || '-' }}</p>
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Profil Anki</p>
        </div>
        <div class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700">
          <p class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ anki.bridgeHealth.value?.anki_version || '-' }}</p>
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Versi Anki</p>
        </div>
        <div class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700">
          <p class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ anki.sessionExpiryLabel.value || '-' }}</p>
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Sesi bridge</p>
        </div>
        <div class="rounded-[18px] border border-gray-200 ayumu-card-surface px-4 py-4 dark:border-gray-700">
          <p class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ anki.lastUpdatedAt.value || '-' }}</p>
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Terakhir refresh</p>
        </div>
      </div>
    </section>
  </section>
</template>
