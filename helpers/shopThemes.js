export const DEFAULT_SHOP_THEME = {
  preset: 'default',
  colors: {
    primary: '#1976d2',
    primaryHover: '#155fa8',
    primarySoft: '#e8f2ff',
    background: '#f3f5f8',
    surface: '#ffffff',
    surfaceMuted: '#f8fafc',
    border: '#dfe5ee',
    borderSoft: '#e8edf3',
    text: '#121826',
    textBody: '#1f2933',
    textMuted: '#687386',
    success: '#00e676',
    warning: '#ffa014',
    danger: '#d83b3b',
  },
}

export const SHOP_THEME_PRESETS = {
  default: {
    label: 'Default',
    theme: DEFAULT_SHOP_THEME,
  },
  bistrotVert: {
    label: 'Bistrot Vert',
    theme: {
      preset: 'bistrotVert',
      colors: {
        primary: '#1f7a4d',
        primaryHover: '#155f3b',
        primarySoft: '#e5f5ec',
        background: '#f4f8f5',
        surface: '#ffffff',
        surfaceMuted: '#eef6f1',
        border: '#cddfd4',
        borderSoft: '#e1ece5',
        text: '#102019',
        textBody: '#24382d',
        textMuted: '#607268',
        success: '#18b66a',
        warning: '#d99b18',
        danger: '#c84646',
      },
    },
  },
  comptoirRouge: {
    label: 'Comptoir Rouge',
    theme: {
      preset: 'comptoirRouge',
      colors: {
        primary: '#c7352c',
        primaryHover: '#9f291f',
        primarySoft: '#ffe9e4',
        background: '#fff7f2',
        surface: '#ffffff',
        surfaceMuted: '#fff0e8',
        border: '#ebcfc4',
        borderSoft: '#f5ded5',
        text: '#241412',
        textBody: '#3d2924',
        textMuted: '#7b665f',
        success: '#1aa86b',
        warning: '#e38b22',
        danger: '#b71d2a',
      },
    },
  },
  noirModerne: {
    label: 'Noir Moderne',
    theme: {
      preset: 'noirModerne',
      colors: {
        primary: '#4f8cff',
        primaryHover: '#2f6eea',
        primarySoft: '#16233d',
        background: '#0d1117',
        surface: '#151b23',
        surfaceMuted: '#1f2937',
        border: '#303a46',
        borderSoft: '#26313d',
        text: '#f7fafc',
        textBody: '#d7dee8',
        textMuted: '#9aa6b2',
        success: '#24d17e',
        warning: '#f2b84b',
        danger: '#ff6b6b',
      },
    },
  },
}

export const SHOP_THEME_COLOR_FIELDS = [
  { key: 'primary', label: 'Couleur principale' },
  { key: 'primaryHover', label: 'Couleur principale au survol' },
  { key: 'primarySoft', label: 'Fond principal doux' },
  { key: 'background', label: 'Fond de page' },
  { key: 'surface', label: 'Surface' },
  { key: 'surfaceMuted', label: 'Surface secondaire' },
  { key: 'border', label: 'Bordure' },
  { key: 'borderSoft', label: 'Bordure douce' },
  { key: 'text', label: 'Texte fort' },
  { key: 'textBody', label: 'Texte courant' },
  { key: 'textMuted', label: 'Texte discret' },
  { key: 'success', label: 'Succes' },
  { key: 'warning', label: 'Alerte' },
  { key: 'danger', label: 'Erreur' },
]

const CSS_VAR_MAP = {
  primary: '--se-color-primary',
  primaryHover: '--se-color-primary-hover',
  primarySoft: '--se-color-primary-soft',
  background: '--se-color-bg',
  surface: '--se-color-surface',
  surfaceMuted: '--se-color-surface-muted',
  border: '--se-color-border',
  borderSoft: '--se-color-border-soft',
  text: '--se-color-text',
  textBody: '--se-color-text-body',
  textMuted: '--se-color-text-muted',
  success: '--se-color-success',
  warning: '--se-color-warning',
  danger: '--se-color-danger',
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const cloneTheme = (theme) => ({
  preset: theme.preset,
  colors: { ...theme.colors },
})

function parseThemeValue(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null

  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

export function normalizeShopTheme(value) {
  const parsed = parseThemeValue(value)
  if (!parsed || typeof parsed !== 'object') return cloneTheme(DEFAULT_SHOP_THEME)

  const preset = SHOP_THEME_PRESETS[parsed.preset]
    ? parsed.preset
    : DEFAULT_SHOP_THEME.preset
  const normalized = {
    preset,
    colors: { ...DEFAULT_SHOP_THEME.colors },
  }
  const colors =
    parsed.colors && typeof parsed.colors === 'object' ? parsed.colors : {}

  Object.keys(DEFAULT_SHOP_THEME.colors).forEach((key) => {
    if (HEX_COLOR_PATTERN.test(colors[key])) normalized.colors[key] = colors[key]
  })

  return normalized
}

export function shopThemeToCssVars(theme) {
  const normalized = normalizeShopTheme(theme)
  return Object.keys(CSS_VAR_MAP).reduce((vars, key) => {
    vars[CSS_VAR_MAP[key]] = normalized.colors[key]
    return vars
  }, {})
}
