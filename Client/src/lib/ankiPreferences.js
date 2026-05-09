const API_BASE = import.meta.env.VITE_API_URL || ''

function authHeaders(accessToken) {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {}
}

async function parseJson(response) {
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json')
    ? response.json()
    : { message: await response.text() }
}

export function defaultAnkiPreferences() {
  return {
    active_theme: 'kiku_like',
    enabled_plugins: ['kiku_like_cards', 'review_meta_footer'],
    model_preferences: {},
  }
}

export async function loadAnkiPreferences(accessToken) {
  const response = await fetch(`${API_BASE}/api/anki/preferences`, {
    headers: authHeaders(accessToken),
    credentials: 'include',
  })

  const payload = await parseJson(response)
  if (!response.ok) {
    throw new Error(payload.message || 'Gagal memuat preferensi Anki.')
  }

  return {
    preferences: payload.preferences || defaultAnkiPreferences(),
    storageReady: payload.storage_ready !== false,
    message: payload.message || null,
  }
}

export async function saveAnkiPreferences(accessToken, preferences) {
  const response = await fetch(`${API_BASE}/api/anki/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(accessToken),
    },
    credentials: 'include',
    body: JSON.stringify(preferences),
  })

  const payload = await parseJson(response)
  if (!response.ok) {
    throw new Error(payload.message || 'Gagal menyimpan preferensi Anki.')
  }

  return {
    preferences: payload.preferences || defaultAnkiPreferences(),
    storageReady: payload.storage_ready !== false,
    message: payload.message || null,
  }
}
