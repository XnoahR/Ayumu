const BRIDGE_PORT = 8766
const BRIDGE_BASE_URLS = [
  `http://127.0.0.1:${BRIDGE_PORT}`,
  `http://localhost:${BRIDGE_PORT}`,
]
const STORAGE_KEY = 'ayumu_anki_bridge_seen'

function delayTimeout(ms, controller) {
  return window.setTimeout(() => controller.abort(), ms)
}

async function requestJson(baseUrl, path, options = {}) {
  const controller = new AbortController()
  const timeoutId = delayTimeout(options.timeoutMs || 2500, controller)

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
      signal: controller.signal,
    })

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : { message: await response.text() }

    if (!response.ok) {
      const error = new Error(payload.message || `Permintaan bridge gagal (${response.status})`)
      error.status = response.status
      error.payload = payload
      error.baseUrl = baseUrl
      throw error
    }

    return payload
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Waktu habis saat menghubungi bridge lokal.')
      timeoutError.code = 'TIMEOUT'
      timeoutError.baseUrl = baseUrl
      throw timeoutError
    }

    if (error instanceof TypeError) {
      error.code = 'NETWORK'
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function bridgeHeaders(sessionToken, headers = {}) {
  return {
    'X-Ayumu-Bridge-Session': sessionToken,
    ...headers,
  }
}

function markBridgeSeen() {
  window.localStorage.setItem(STORAGE_KEY, '1')
}

function hasSeenBridge() {
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

export async function discoverBridge() {
  let lastError = null

  for (const baseUrl of BRIDGE_BASE_URLS) {
    try {
      const health = await requestJson(baseUrl, '/health')
      markBridgeSeen()
      return { baseUrl, health }
    } catch (error) {
      if (error.status === 403) {
        error.code = 'BLOCKED'
        throw error
      }
      lastError = error
    }
  }

  if (lastError) {
    throw lastError
  }

  const error = new Error('Bridge tidak tersedia.')
  error.code = 'NETWORK'
  throw error
}

export async function createBridgeSession(baseUrl) {
  return requestJson(baseUrl, '/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ client: 'ayumu-web' }),
  })
}

export async function loadBridgeSnapshot(baseUrl, sessionToken) {
  const headers = bridgeHeaders(sessionToken)

  const [decksResponse, modelsResponse] = await Promise.all([
    requestJson(baseUrl, '/decks', { headers, timeoutMs: 5000 }),
    requestJson(baseUrl, '/models', { headers, timeoutMs: 5000 }),
  ])

  return {
    decks: decksResponse.decks || [],
    models: modelsResponse.models || [],
  }
}

export async function loadModelFields(baseUrl, sessionToken, modelId) {
  const headers = bridgeHeaders(sessionToken)
  const response = await requestJson(baseUrl, `/models/${modelId}/fields`, { headers, timeoutMs: 5000 })
  return response.fields || []
}

export async function startBridgeReview(baseUrl, sessionToken, deckId) {
  const headers = bridgeHeaders(sessionToken)
  return requestJson(baseUrl, `/decks/${deckId}/cards`, { headers, timeoutMs: 8000 })
}

export async function submitBridgeReview(baseUrl, sessionToken, payload) {
  const headers = bridgeHeaders(sessionToken, {
    'Content-Type': 'application/json',
  })

  return requestJson(baseUrl, '/review', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    timeoutMs: 8000,
  })
}

export function classifyBridgeError(error) {
  if (error?.code === 'BLOCKED' || error?.status === 403) {
    return {
      status: 'blocked',
      message: 'Ayumu bisa menjangkau bridge, tapi origin browser ini tidak diizinkan oleh add-on.',
    }
  }

  if (error?.status === 503) {
    return {
      status: 'reachable',
      message: error.payload?.message || 'Bridge aktif, tapi belum ada koleksi Anki yang dibuka.',
    }
  }

  return {
    status: hasSeenBridge() ? 'not-running' : 'not-installed',
    message: hasSeenBridge()
      ? 'Bridge Ayumu tidak merespons. Pastikan Anki sedang terbuka.'
      : 'Bridge Ayumu belum ditemukan di mesin ini. Pasang add-on Anki lalu mulai ulang Anki.',
  }
}

export function formatBridgeTime(unixTimestamp) {
  if (!unixTimestamp) return null
  return new Date(unixTimestamp * 1000).toLocaleTimeString()
}
