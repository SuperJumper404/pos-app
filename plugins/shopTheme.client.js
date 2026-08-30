import { normalizeShopTheme, shopThemeToCssVars } from '@/helpers/shopThemes'

function applyVuetifyTheme(vuetify, theme) {
  if (!vuetify || !vuetify.framework || !vuetify.framework.theme) return

  const themes = vuetify.framework.theme.themes
  const colors = theme.colors
  ;['light', 'dark'].forEach((mode) => {
    if (!themes[mode]) return
    themes[mode].primary = colors.primary
    themes[mode].success = colors.success
    themes[mode].warning = colors.warning
    themes[mode].error = colors.danger
  })
}

function applyTheme(theme, vuetify) {
  const normalizedTheme = normalizeShopTheme(theme)
  const vars = shopThemeToCssVars(normalizedTheme)
  Object.keys(vars).forEach((name) => {
    document.documentElement.style.setProperty(name, vars[name])
  })
  applyVuetifyTheme(vuetify, normalizedTheme)
}

export default ({ app, store }) => {
  applyTheme(store.get('shop/shop_theme'), app.vuetify)

  store.watch(
    () => store.get('shop/shop_theme'),
    (theme) => applyTheme(theme, app.vuetify),
    { deep: true }
  )
}
