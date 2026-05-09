export const REVIEW_THEMES = [
  {
    id: 'kiku_like',
    name: 'Kiku-like',
    description: 'Tampilan tenang untuk front/back Jepang dengan hierarki yang bersih.',
    accentClass: 'bg-indigo-500',
  },
  {
    id: 'ayumu_focus',
    name: 'Ayumu Focus',
    description: 'Versi Ayumu yang lebih padat dan utilitarian untuk review panjang.',
    accentClass: 'bg-slate-500',
  },
]

export const REVIEW_PLUGINS = [
  {
    id: 'kiku_like_cards',
    name: 'Layout kartu Kiku-like',
    description: 'Gunakan tata letak utama dengan panel depan/belakang yang lebih editorial.',
    type: 'layout',
    defaultEnabled: true,
  },
  {
    id: 'review_meta_footer',
    name: 'Footer meta review',
    description: 'Tampilkan deck, model, dan tag di footer kartu.',
    type: 'layout',
    defaultEnabled: true,
  },
  {
    id: 'hint_callout',
    name: 'Callout petunjuk',
    description: 'Tampilkan area hint yang lebih jelas saat field petunjuk tersedia.',
    type: 'layout',
    defaultEnabled: false,
  },
]

export function findTheme(themeId) {
  return REVIEW_THEMES.find((theme) => theme.id === themeId) || REVIEW_THEMES[0]
}

export function defaultEnabledPlugins() {
  return REVIEW_PLUGINS.filter((plugin) => plugin.defaultEnabled).map((plugin) => plugin.id)
}
