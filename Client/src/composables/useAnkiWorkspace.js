import { computed, ref, watch } from 'vue'
import { useAuthStore } from '../store/auth.js'
import {
  classifyBridgeError,
  createBridgeSession,
  discoverBridge,
  formatBridgeTime,
  loadBridgeSnapshot,
  loadModelFields,
  startBridgeReview,
  submitBridgeReview,
} from '../lib/ankiBridge.js'
import {
  defaultAnkiPreferences,
  loadAnkiPreferences,
  saveAnkiPreferences,
} from '../lib/ankiPreferences.js'
import {
  defaultEnabledPlugins,
  findTheme,
} from '../lib/ankiReviewPlugins.js'

let workspace = null
let watchersAttached = false
const LOCAL_SETTINGS_KEY = 'ayumu_anki_local_settings_v1'

function createEmptyMapping() {
  return {
    front_field: '',
    back_field: '',
    hint_field: '',
    audio_field: '',
    image_field: '',
    show_tags: true,
    show_hint_before_flip: false,
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createLocalAnkiSettings() {
  return {
    audioAutoplay: false,
    manualAddons: [],
    manualImports: [],
  }
}

function loadLocalAnkiSettings() {
  try {
    const raw = window.localStorage.getItem(LOCAL_SETTINGS_KEY)
    if (!raw) return createLocalAnkiSettings()
    const parsed = JSON.parse(raw)
    return {
      audioAutoplay: parsed?.audioAutoplay === true,
      manualAddons: Array.isArray(parsed?.manualAddons) ? parsed.manualAddons : [],
      manualImports: Array.isArray(parsed?.manualImports) ? parsed.manualImports : [],
    }
  } catch {
    return createLocalAnkiSettings()
  }
}

function persistLocalAnkiSettings(settings) {
  window.localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings))
}

function normalizePreferences(input) {
  const defaults = defaultAnkiPreferences()
  return {
    active_theme: input?.active_theme || defaults.active_theme,
    enabled_plugins: Array.isArray(input?.enabled_plugins) && input.enabled_plugins.length
      ? [...new Set(input.enabled_plugins)]
      : defaultEnabledPlugins(),
    model_preferences: input?.model_preferences && typeof input.model_preferences === 'object'
      ? clone(input.model_preferences)
      : {},
  }
}

function fallbackMappingFromFields(fieldNames = []) {
  return {
    ...createEmptyMapping(),
    front_field: fieldNames[0] || '',
    back_field: fieldNames[1] || fieldNames[0] || '',
  }
}

function extractFieldNames(fields) {
  return [...fields]
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((field) => field.name)
}

export function useAnkiWorkspace() {
  const authStore = useAuthStore()

  if (workspace) {
    return workspace
  }

  const status = ref('checking')
  const statusMessage = ref('Mencari bridge Anki lokal...')
  const bridgeHealth = ref(null)
  const bridgeBaseUrl = ref('')
  const sessionToken = ref(null)
  const sessionExpiresAt = ref(null)
  const lastUpdatedAt = ref(null)
  const isBridgeLoading = ref(false)
  const decks = ref([])
  const models = ref([])

  const selectedDeckId = ref(null)
  const activeCard = ref(null)
  const reviewSummary = ref(null)
  const isBackVisible = ref(false)
  const isReviewLoading = ref(false)

  const preferences = ref(defaultAnkiPreferences())
  const preferenceDraft = ref(defaultAnkiPreferences())
  const backendMessage = ref('Preferensi review akan disimpan ke akun Ayumu saat tersedia.')
  const isSavingPreferences = ref(false)
  const storageReady = ref(false)
  const isInitialized = ref(false)

  const selectedModelId = ref('')
  const useDeckOverride = ref(false)
  const modelFieldsCache = ref({})
  const mappingForm = ref(createEmptyMapping())
  const localSettings = ref(loadLocalAnkiSettings())
  const manualAddonForm = ref({
    name: '',
    source: '',
    notes: '',
  })
  const manualImportForm = ref({
    title: '',
    deckName: '',
    source: '',
    notes: '',
  })
  const toast = ref(null)

  const installSteps = [
    'Salin folder add-on ayumu_bridge ke addons21 di Anki desktop.',
    'Mulai ulang Anki lalu buka koleksi yang ingin direview.',
    'Kembali ke Ayumu, tekan Hubungkan, lalu pilih dek yang ingin dimainkan di web.',
  ]

  function showToast(message, type = 'error') {
    toast.value = { message, type, key: Date.now() }
  }

  function dismissToast() {
    toast.value = null
  }

  const topLevelDecks = computed(() => decks.value.filter((deck) => (deck.depth || 0) === 0))
  const totalCards = computed(() => topLevelDecks.value.reduce((sum, deck) => sum + (deck.total_cards || 0), 0))
  const dueToday = computed(() => topLevelDecks.value.reduce((sum, deck) => sum + (deck.due_count || 0), 0))
  const newToday = computed(() => topLevelDecks.value.reduce((sum, deck) => sum + (deck.new_count || 0), 0))
  const learnToday = computed(() => topLevelDecks.value.reduce((sum, deck) => sum + (deck.learn_count || 0), 0))
  const selectedDeck = computed(() => decks.value.find((deck) => String(deck.id) === String(selectedDeckId.value)) || null)
  const sessionExpiryLabel = computed(() => formatBridgeTime(sessionExpiresAt.value))
  const activeTheme = computed(() => findTheme(preferenceDraft.value.active_theme))
  const enabledPluginIds = computed(() => preferenceDraft.value.enabled_plugins || [])
  const currentModelFields = computed(() => modelFieldsCache.value[selectedModelId.value] || [])
  const currentFieldNames = computed(() => currentModelFields.value.map((field) => field.name))

  const statusTone = computed(() => {
    if (status.value === 'reachable') return 'text-emerald-700 dark:text-emerald-300'
    if (status.value === 'blocked') return 'text-amber-700 dark:text-amber-300'
    if (status.value === 'checking') return 'text-gray-500 dark:text-gray-400'
    return 'text-rose-700 dark:text-rose-300'
  })

  const reviewReady = computed(() => status.value === 'reachable' && bridgeHealth.value?.profile_loaded !== false && sessionToken.value)
  const hasSelection = computed(() => Boolean(selectedDeckId.value))

  const activeReviewMapping = computed(() => {
    const modelId = activeCard.value?.model_id ? String(activeCard.value.model_id) : selectedModelId.value
    const fieldNames = activeCard.value?.fields
      ? extractFieldNames(Object.values(activeCard.value.fields))
      : currentFieldNames.value

    const fallback = fallbackMappingFromFields(fieldNames)
    if (!modelId) return fallback

    const entry = preferenceDraft.value.model_preferences?.[modelId] || {}
    const deckOverride = selectedDeckId.value ? entry.deck_overrides?.[String(selectedDeckId.value)] : null
    const baseMapping = deckOverride || entry.default || {}

    return {
      ...fallback,
      ...baseMapping,
      show_tags: baseMapping.show_tags ?? fallback.show_tags,
      show_hint_before_flip: baseMapping.show_hint_before_flip ?? fallback.show_hint_before_flip,
    }
  })

  const saveDisabled = computed(() => isSavingPreferences.value || !selectedModelId.value)
  const audioAutoplayEnabled = computed(() => localSettings.value.audioAutoplay === true)

  function resetManualAddonForm() {
    manualAddonForm.value = {
      name: '',
      source: '',
      notes: '',
    }
  }

  function resetManualImportForm() {
    manualImportForm.value = {
      title: '',
      deckName: '',
      source: '',
      notes: '',
    }
  }

  function saveLocalSettings() {
    persistLocalAnkiSettings(localSettings.value)
  }

  function toggleAudioAutoplay() {
    localSettings.value.audioAutoplay = !localSettings.value.audioAutoplay
    saveLocalSettings()
    showToast(
      localSettings.value.audioAutoplay
        ? 'Auto play audio di review Anki diaktifkan.'
        : 'Auto play audio di review Anki dimatikan.',
      'success'
    )
  }

  function addManualAddon() {
    const name = manualAddonForm.value.name.trim()
    if (!name) {
      showToast('Nama addon manual belum diisi.')
      return
    }

    localSettings.value.manualAddons.unshift({
      id: `addon-${Date.now()}`,
      name,
      source: manualAddonForm.value.source.trim(),
      notes: manualAddonForm.value.notes.trim(),
      createdAt: new Date().toISOString(),
    })
    saveLocalSettings()
    resetManualAddonForm()
    showToast('Addon manual ditambahkan ke daftar lokal.', 'success')
  }

  function removeManualAddon(addonId) {
    localSettings.value.manualAddons = localSettings.value.manualAddons.filter((addon) => addon.id !== addonId)
    saveLocalSettings()
    showToast('Addon manual dihapus dari daftar lokal.', 'success')
  }

  function addManualImport() {
    const title = manualImportForm.value.title.trim()
    if (!title) {
      showToast('Judul import kartu belum diisi.')
      return
    }

    localSettings.value.manualImports.unshift({
      id: `import-${Date.now()}`,
      title,
      deckName: manualImportForm.value.deckName.trim(),
      source: manualImportForm.value.source.trim(),
      notes: manualImportForm.value.notes.trim(),
      createdAt: new Date().toISOString(),
    })
    saveLocalSettings()
    resetManualImportForm()
    showToast('Daftar import kartu manual ditambahkan.', 'success')
  }

  function removeManualImport(importId) {
    localSettings.value.manualImports = localSettings.value.manualImports.filter((entry) => entry.id !== importId)
    saveLocalSettings()
    showToast('Item import kartu dihapus dari daftar lokal.', 'success')
  }

  async function ensureModelFields(modelId) {
    if (!modelId || modelFieldsCache.value[modelId] || !bridgeBaseUrl.value || !sessionToken.value) {
      return
    }

    try {
      const fields = await loadModelFields(bridgeBaseUrl.value, sessionToken.value, modelId)
      modelFieldsCache.value = {
        ...modelFieldsCache.value,
        [modelId]: fields,
      }
    } catch (error) {
      showToast(error.message || 'Gagal memuat field model Anki.')
    }
  }

  function syncMappingForm() {
    const modelId = selectedModelId.value
    if (!modelId) {
      mappingForm.value = createEmptyMapping()
      return
    }

    const fieldNames = currentFieldNames.value
    const fallback = fallbackMappingFromFields(fieldNames)
    const entry = preferenceDraft.value.model_preferences?.[modelId] || {}
    const stored = useDeckOverride.value && selectedDeckId.value
      ? entry.deck_overrides?.[String(selectedDeckId.value)] || entry.default || {}
      : entry.default || {}

    mappingForm.value = {
      ...fallback,
      ...stored,
      show_tags: stored.show_tags ?? fallback.show_tags,
      show_hint_before_flip: stored.show_hint_before_flip ?? fallback.show_hint_before_flip,
    }
  }

  function persistMappingFormToDraft() {
    const modelId = selectedModelId.value
    if (!modelId) return

    if (!preferenceDraft.value.model_preferences[modelId]) {
      preferenceDraft.value.model_preferences[modelId] = {
        default: createEmptyMapping(),
        deck_overrides: {},
      }
    }

    const entry = preferenceDraft.value.model_preferences[modelId]
    entry.default ||= createEmptyMapping()
    entry.deck_overrides ||= {}

    if (useDeckOverride.value && selectedDeckId.value) {
      entry.deck_overrides[String(selectedDeckId.value)] = clone(mappingForm.value)
    } else {
      entry.default = clone(mappingForm.value)
    }
  }

  async function refreshBridge() {
    isBridgeLoading.value = true
    status.value = 'checking'
    statusMessage.value = 'Memeriksa bridge localhost...'

    try {
      const discovery = await discoverBridge()
      bridgeBaseUrl.value = discovery.baseUrl
      bridgeHealth.value = discovery.health

      if (!discovery.health.profile_loaded) {
        status.value = 'reachable'
        statusMessage.value = 'Bridge aktif, tapi koleksi Anki belum dibuka.'
        decks.value = []
        models.value = []
        sessionToken.value = null
        sessionExpiresAt.value = null
        activeCard.value = null
        return
      }

      const session = await createBridgeSession(discovery.baseUrl)
      sessionToken.value = session.session
      sessionExpiresAt.value = session.expires_at
      const snapshot = await loadBridgeSnapshot(discovery.baseUrl, session.session)
      decks.value = snapshot.decks || []
      models.value = snapshot.models || []
      lastUpdatedAt.value = new Date().toLocaleTimeString()
      status.value = 'reachable'
      statusMessage.value = `Terhubung ke ${discovery.health.profile_name || 'profil Anki saat ini'}.`

      if (!selectedDeckId.value && decks.value.length) {
        selectedDeckId.value = String((topLevelDecks.value[0] || decks.value[0]).id)
      }
      if (!selectedModelId.value && models.value.length) {
        selectedModelId.value = String(models.value[0].id)
      }
    } catch (error) {
      const classification = classifyBridgeError(error)
      status.value = classification.status
      statusMessage.value = classification.message
      decks.value = []
      models.value = []
      sessionToken.value = null
      sessionExpiresAt.value = null
      activeCard.value = null
    } finally {
      isBridgeLoading.value = false
    }
  }

  async function loadPreferencesState() {
    try {
      const loaded = await loadAnkiPreferences(authStore.accessToken)
      preferences.value = normalizePreferences(loaded.preferences)
      preferenceDraft.value = normalizePreferences(loaded.preferences)
      storageReady.value = loaded.storageReady

      if (!loaded.storageReady) {
        backendMessage.value = loaded.message || 'Tabel preferensi Anki belum tersedia. Ayumu tetap memakai draft lokal sementara.'
      } else {
        backendMessage.value = authStore.isAuthenticated
          ? 'Preferensi review tersimpan ke akun Ayumu ini.'
          : 'Preferensi review bisa disimpan meski kamu belum login, lalu diklaim saat masuk.'
      }
    } catch (error) {
      preferences.value = normalizePreferences(defaultAnkiPreferences())
      preferenceDraft.value = normalizePreferences(defaultAnkiPreferences())
      storageReady.value = false
      backendMessage.value = 'Backend preferensi belum merespons. Ayumu tetap jalan dengan draft lokal sementara.'
      showToast(error.message || 'Gagal memuat preferensi Anki.')
    }
  }

  async function startSelectedDeckReview() {
    if (!reviewReady.value || !selectedDeckId.value) return false

    isReviewLoading.value = true
    try {
      const response = await startBridgeReview(bridgeBaseUrl.value, sessionToken.value, selectedDeckId.value)
      activeCard.value = response.active_card || response.cards?.[0] || null
      reviewSummary.value = response.session_summary || null
      isBackVisible.value = false

      if (activeCard.value?.model_id) {
        selectedModelId.value ||= String(activeCard.value.model_id)
        await ensureModelFields(String(activeCard.value.model_id))
      }
      return true
    } catch (error) {
      showToast(error.message || 'Gagal memulai review dek.')
      return false
    } finally {
      isReviewLoading.value = false
    }
  }

  async function answerCard(rating) {
    if (!activeCard.value || !sessionToken.value) return

    isReviewLoading.value = true
    try {
      const response = await submitBridgeReview(bridgeBaseUrl.value, sessionToken.value, {
        card_id: activeCard.value.card_id,
        rating,
      })
      activeCard.value = response.next_card || null
      reviewSummary.value = response.session_summary || null
      isBackVisible.value = false

      if (activeCard.value?.model_id) {
        selectedModelId.value ||= String(activeCard.value.model_id)
        await ensureModelFields(String(activeCard.value.model_id))
      }
    } catch (error) {
      showToast(error.message || 'Gagal mengirim rating review ke Anki.')
    } finally {
      isReviewLoading.value = false
    }
  }

  async function savePreferencesState() {
    persistMappingFormToDraft()
    isSavingPreferences.value = true
    try {
      const saved = await saveAnkiPreferences(authStore.accessToken, preferenceDraft.value)
      const normalized = normalizePreferences(saved.preferences)
      preferences.value = normalized
      preferenceDraft.value = clone(normalized)
      storageReady.value = saved.storageReady
      backendMessage.value = saved.storageReady
        ? (authStore.isAuthenticated
          ? 'Preferensi review tersimpan ke akun Ayumu ini.'
          : 'Preferensi review tersimpan dan bisa diklaim saat kamu login.')
        : (saved.message || 'Preferensi belum bisa ditulis ke backend. Ayumu masih memakai draft lokal.')
      syncMappingForm()
      showToast('Pengaturan review Anki berhasil disimpan.', 'success')
    } catch (error) {
      showToast(error.message || 'Gagal menyimpan preferensi Anki.')
    } finally {
      isSavingPreferences.value = false
    }
  }

  function togglePlugin(pluginId) {
    const current = new Set(preferenceDraft.value.enabled_plugins || [])
    if (current.has(pluginId)) {
      current.delete(pluginId)
    } else {
      current.add(pluginId)
    }
    preferenceDraft.value.enabled_plugins = [...current]
  }

  async function initialize() {
    if (isInitialized.value) return

    await Promise.all([
      loadPreferencesState(),
      refreshBridge(),
    ])

    if (selectedModelId.value) {
      await ensureModelFields(selectedModelId.value)
    }
    syncMappingForm()
    isInitialized.value = true
  }

  if (!watchersAttached) {
    watchersAttached = true

    watch(selectedModelId, async (modelId) => {
      if (!modelId) return
      await ensureModelFields(modelId)
      syncMappingForm()
    })

    watch([useDeckOverride, selectedDeckId], () => {
      syncMappingForm()
    })

    watch(mappingForm, () => {
      persistMappingFormToDraft()
    }, { deep: true })

    watch(activeCard, async (card) => {
      if (!card?.model_id) return
      if (!selectedModelId.value) {
        selectedModelId.value = String(card.model_id)
      }
      await ensureModelFields(String(card.model_id))
    })

    watch(() => authStore.accessToken, async () => {
      await loadPreferencesState()
      syncMappingForm()
    })

    watch(localSettings, () => {
      saveLocalSettings()
    }, { deep: true })
  }

  workspace = {
    status,
    statusMessage,
    bridgeHealth,
    bridgeBaseUrl,
    sessionToken,
    sessionExpiresAt,
    lastUpdatedAt,
    isBridgeLoading,
    decks,
    models,
    selectedDeckId,
    activeCard,
    reviewSummary,
    isBackVisible,
    isReviewLoading,
    preferences,
    preferenceDraft,
    backendMessage,
    isSavingPreferences,
    storageReady,
    isInitialized,
    selectedModelId,
    useDeckOverride,
    modelFieldsCache,
    mappingForm,
    localSettings,
    manualAddonForm,
    manualImportForm,
    toast,
    installSteps,
    topLevelDecks,
    totalCards,
    dueToday,
    newToday,
    learnToday,
    selectedDeck,
    sessionExpiryLabel,
    activeTheme,
    enabledPluginIds,
    currentModelFields,
    currentFieldNames,
    statusTone,
    reviewReady,
    hasSelection,
    activeReviewMapping,
    saveDisabled,
    audioAutoplayEnabled,
    initialize,
    refreshBridge,
    loadPreferencesState,
    startSelectedDeckReview,
    answerCard,
    savePreferencesState,
    togglePlugin,
    ensureModelFields,
    syncMappingForm,
    toggleAudioAutoplay,
    addManualAddon,
    removeManualAddon,
    addManualImport,
    removeManualImport,
    showToast,
    dismissToast,
  }

  return workspace
}
