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
      const error = new Error(payload.message || `Bridge request failed (${response.status})`)
      error.status = response.status
      error.payload = payload
      error.baseUrl = baseUrl
      throw error
    }

    return payload
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Timed out while contacting the local bridge.')
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

  const error = new Error('Bridge unavailable.')
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
  const headers = {
    'X-Ayumu-Bridge-Session': sessionToken,
  }

  const [decksResponse, modelsResponse] = await Promise.all([
    requestJson(baseUrl, '/decks', { headers, timeoutMs: 5000 }),
    requestJson(baseUrl, '/models', { headers, timeoutMs: 5000 }),
  ])

  return {
    decks: decksResponse.decks || [],
    models: modelsResponse.models || [],
  }
}

export function classifyBridgeError(error) {
  if (error?.code === 'BLOCKED' || error?.status === 403) {
    return {
      status: 'blocked',
      message: 'Ayumu is reaching the bridge, but this browser origin is not allowed by the add-on.',
    }
  }

  if (error?.status === 503) {
    return {
      status: 'reachable',
      message: error.payload?.message || 'The bridge is running, but no Anki collection is open yet.',
    }
  }

  return {
    status: hasSeenBridge() ? 'not-running' : 'not-installed',
    message: hasSeenBridge()
      ? 'The Ayumu bridge is not responding. Make sure Anki is open.'
      : 'No Ayumu bridge was found on this machine yet. Install the Anki add-on and restart Anki.',
  }
}

export function formatBridgeTime(unixTimestamp) {
  if (!unixTimestamp) return null
  return new Date(unixTimestamp * 1000).toLocaleTimeString()
}
