<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  classifyBridgeError,
  createBridgeSession,
  discoverBridge,
  formatBridgeTime,
  loadBridgeSnapshot,
} from '../lib/ankiBridge.js'

const status = ref('checking')
const statusMessage = ref('Looking for a local Anki bridge...')
const bridgeHealth = ref(null)
const decks = ref([])
const models = ref([])
const sessionExpiresAt = ref(null)
const lastUpdatedAt = ref(null)
const isConnecting = ref(false)

const topLevelDecks = computed(() => decks.value.filter((deck) => (deck.depth || 0) === 0))
const totalCards = computed(() => topLevelDecks.value.reduce((sum, deck) => sum + (deck.total_cards || 0), 0))
const dueToday = computed(() => topLevelDecks.value.reduce((sum, deck) => sum + (deck.due_count || 0), 0))
const newToday = computed(() => topLevelDecks.value.reduce((sum, deck) => sum + (deck.new_count || 0), 0))
const learnToday = computed(() => topLevelDecks.value.reduce((sum, deck) => sum + (deck.learn_count || 0), 0))

const statusTone = computed(() => {
  if (status.value === 'reachable') return 'text-emerald-700 dark:text-emerald-300'
  if (status.value === 'blocked') return 'text-amber-700 dark:text-amber-300'
  if (status.value === 'checking') return 'text-gray-500 dark:text-gray-400'
  return 'text-rose-700 dark:text-rose-300'
})

const sessionExpiryLabel = computed(() => formatBridgeTime(sessionExpiresAt.value))

async function refreshBridge() {
  isConnecting.value = true
  status.value = 'checking'
  statusMessage.value = 'Checking localhost bridge...'

  try {
    const discovery = await discoverBridge()
    bridgeHealth.value = discovery.health

    if (!discovery.health.profile_loaded) {
      status.value = 'reachable'
      statusMessage.value = 'The bridge is running, but Anki does not have a collection open yet.'
      decks.value = []
      models.value = []
      sessionExpiresAt.value = null
      return
    }

    const session = await createBridgeSession(discovery.baseUrl)
    sessionExpiresAt.value = session.expires_at
    const snapshot = await loadBridgeSnapshot(discovery.baseUrl, session.session)
    decks.value = snapshot.decks
    models.value = snapshot.models
    lastUpdatedAt.value = new Date().toLocaleTimeString()
    status.value = 'reachable'
    statusMessage.value = `Connected to ${discovery.health.profile_name || 'the current Anki profile'}.`
  } catch (error) {
    const classification = classifyBridgeError(error)
    status.value = classification.status
    statusMessage.value = classification.message
    decks.value = []
    models.value = []
    sessionExpiresAt.value = null
  } finally {
    isConnecting.value = false
  }
}

onMounted(() => {
  refreshBridge()
})
</script>

<template>
  <section class="rounded-[14px] border border-gray-300 ayumu-panel bg-white dark:bg-gray-800 overflow-hidden">
    <div class="border-b border-gray-300 dark:border-gray-700 bg-[#efefef] dark:bg-gray-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-bold text-gray-800 dark:text-gray-100">Decks</h2>
        <p class="text-xs mt-0.5" :class="statusTone">{{ statusMessage }}</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="refreshBridge"
          :disabled="isConnecting"
          class="ayumu-secondary-button px-3 py-2 rounded-md border border-gray-300 bg-white text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          {{ isConnecting ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div class="border-b border-gray-300 ayumu-note-surface bg-[#f7f7f7] px-4 py-3 grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
      <div>
        <p class="text-lg font-black text-gray-900 dark:text-white">{{ topLevelDecks.length }}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Decks</p>
      </div>
      <div>
        <p class="text-lg font-black text-gray-900 dark:text-white">{{ totalCards }}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Cards</p>
      </div>
      <div>
        <p class="text-lg font-black text-gray-900 dark:text-white">{{ newToday }}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">New</p>
      </div>
      <div>
        <p class="text-lg font-black text-gray-900 dark:text-white">{{ learnToday }}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Learn</p>
      </div>
      <div>
        <p class="text-lg font-black text-gray-900 dark:text-white">{{ dueToday }}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Due</p>
      </div>
      <div>
        <p class="text-lg font-black text-gray-900 dark:text-white">{{ models.length }}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">Models</p>
      </div>
    </div>

    <div v-if="bridgeHealth?.anki_version || sessionExpiryLabel || lastUpdatedAt" class="px-4 py-2 border-b border-gray-300 dark:border-gray-700 bg-[#fafafa] dark:bg-gray-900 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
      <span v-if="bridgeHealth?.anki_version">Anki {{ bridgeHealth.anki_version }}</span>
      <span v-if="bridgeHealth?.profile_name">Profile {{ bridgeHealth.profile_name }}</span>
      <span v-if="sessionExpiryLabel">Session {{ sessionExpiryLabel }}</span>
      <span v-if="lastUpdatedAt">Updated {{ lastUpdatedAt }}</span>
    </div>

    <div v-if="status === 'reachable' && bridgeHealth?.profile_loaded !== false" class="grid lg:grid-cols-[minmax(0,1fr)_280px]">
      <div class="min-w-0">
        <div class="grid grid-cols-[minmax(0,1fr)_72px_72px_72px_72px_72px] gap-2 px-4 py-2 border-b border-gray-300 dark:border-gray-700 bg-[#f5f5f5] dark:bg-gray-900 text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text">
          <div>Deck</div>
          <div class="text-right">Cards</div>
          <div class="text-right">New</div>
          <div class="text-right">Learn</div>
          <div class="text-right">Due</div>
          <div class="text-right">Paused</div>
        </div>

        <div v-if="decks.length === 0" class="ayumu-soft-copy px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
          No deck metadata returned yet.
        </div>

        <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="deck in decks"
            :key="deck.id"
            class="ayumu-card-surface grid grid-cols-[minmax(0,1fr)_72px_72px_72px_72px_72px] gap-2 px-4 py-3 text-sm items-center bg-white hover:bg-gray-50"
          >
            <div class="min-w-0">
              <p
                class="font-medium text-gray-900 dark:text-white truncate"
                :style="{ paddingLeft: `${(deck.depth || 0) * 0.85}rem` }"
              >
                {{ deck.name }}
              </p>
            </div>
            <div class="text-right font-bold text-gray-700 dark:text-gray-200">{{ deck.total_cards }}</div>
            <div class="text-right font-bold text-blue-600 dark:text-blue-300">{{ deck.new_count }}</div>
            <div class="text-right font-bold text-red-600 dark:text-red-300">{{ deck.learn_count }}</div>
            <div class="text-right font-bold text-green-700 dark:text-green-300">{{ deck.due_count }}</div>
            <div class="text-right font-bold text-gray-500 dark:text-gray-400">{{ deck.suspended_count }}</div>
          </div>
        </div>
      </div>

      <aside class="border-t lg:border-t-0 lg:border-l border-gray-300 dark:border-gray-700 bg-[#fafafa] dark:bg-gray-900">
        <div class="px-4 py-3 border-b border-gray-300 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100">Note Models</h3>
        </div>
        <div v-if="models.length === 0" class="ayumu-soft-copy px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
          No note models returned yet.
        </div>
        <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="model in models"
            :key="model.id"
            class="px-4 py-3"
          >
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ model.name }}</p>
            <p class="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 ayumu-accent-text mt-1">ID {{ model.id }}</p>
          </div>
        </div>
      </aside>
    </div>

    <div v-else class="ayumu-soft-copy px-4 py-8 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900">
      This bridge reads live desktop Anki data only. Open Anki and a collection, then refresh.
    </div>
  </section>
</template>
