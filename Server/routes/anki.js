const express = require('express');

const router = express.Router();

const DEFAULT_THEME = 'kiku_like';
const DEFAULT_ENABLED_PLUGINS = ['kiku_like_cards', 'review_meta_footer'];

function enc(value) {
  return encodeURIComponent(String(value));
}

function defaultPreferences() {
  return {
    active_theme: DEFAULT_THEME,
    enabled_plugins: [...DEFAULT_ENABLED_PLUGINS],
    model_preferences: {},
  };
}

function sanitizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function sanitizeFieldName(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function sanitizeMapping(mapping = {}) {
  return {
    front_field: sanitizeFieldName(mapping.front_field),
    back_field: sanitizeFieldName(mapping.back_field),
    hint_field: sanitizeFieldName(mapping.hint_field),
    audio_field: sanitizeFieldName(mapping.audio_field),
    image_field: sanitizeFieldName(mapping.image_field),
    show_tags: sanitizeBoolean(mapping.show_tags, true),
    show_hint_before_flip: sanitizeBoolean(mapping.show_hint_before_flip, false),
  };
}

function sanitizeModelPreferences(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const normalized = {};

  for (const [modelId, rawValue] of Object.entries(input)) {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
      continue;
    }

    const entry = {
      default: sanitizeMapping(rawValue.default || rawValue),
      deck_overrides: {},
    };

    const rawDeckOverrides = rawValue.deck_overrides;
    if (rawDeckOverrides && typeof rawDeckOverrides === 'object' && !Array.isArray(rawDeckOverrides)) {
      for (const [deckId, mapping] of Object.entries(rawDeckOverrides)) {
        entry.deck_overrides[String(deckId)] = sanitizeMapping(mapping);
      }
    }

    normalized[String(modelId)] = entry;
  }

  return normalized;
}

function sanitizeEnabledPlugins(input) {
  if (!Array.isArray(input)) {
    return [...DEFAULT_ENABLED_PLUGINS];
  }

  const seen = new Set();
  const normalized = [];

  for (const value of input) {
    const trimmed = String(value || '').trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized.length ? normalized : [...DEFAULT_ENABLED_PLUGINS];
}

function hydratePreferences(record) {
  const defaults = defaultPreferences();
  if (!record) {
    return defaults;
  }

  return {
    active_theme: sanitizeFieldName(record.active_theme) || defaults.active_theme,
    enabled_plugins: sanitizeEnabledPlugins(record.enabled_plugins),
    model_preferences: sanitizeModelPreferences(record.model_preferences),
    updated_at: record.updated_at || null,
  };
}

function isMissingPreferencesTableError(error) {
  return error?.details?.code === 'PGRST205'
    || error?.message?.includes('user_anki_preferences');
}

router.get('/preferences', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User not resolved' });
    }

    const [record] = await supabaseRequest(
      'user_anki_preferences',
      `select=user_id,active_theme,enabled_plugins,model_preferences,updated_at&user_id=eq.${enc(userId)}&limit=1`
    );

    res.json({
      preferences: hydratePreferences(record),
      storage_ready: true,
    });
  } catch (error) {
    if (isMissingPreferencesTableError(error)) {
      res.json({
        preferences: defaultPreferences(),
        storage_ready: false,
        message: 'Tabel preferensi Anki belum dibuat. Jalankan migration 002_anki_preferences.sql di Supabase.',
      });
      return;
    }
    next(error);
  }
});

router.put('/preferences', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User not resolved' });
    }

    const body = req.body || {};
    const payload = {
      user_id: userId,
      active_theme: sanitizeFieldName(body.active_theme) || DEFAULT_THEME,
      enabled_plugins: sanitizeEnabledPlugins(body.enabled_plugins),
      model_preferences: sanitizeModelPreferences(body.model_preferences),
    };

    const [record] = await supabaseRequest(
      'user_anki_preferences',
      'on_conflict=user_id',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        prefer: 'resolution=merge-duplicates,return=representation',
        body: JSON.stringify(payload),
      }
    );

    res.json({
      preferences: hydratePreferences(record),
      storage_ready: true,
    });
  } catch (error) {
    if (isMissingPreferencesTableError(error)) {
      res.status(503).json({
        message: 'Tabel preferensi Anki belum dibuat. Jalankan migration 002_anki_preferences.sql di Supabase.',
        storage_ready: false,
      });
      return;
    }
    next(error);
  }
});

module.exports = router;
