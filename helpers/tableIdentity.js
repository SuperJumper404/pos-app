const DEFAULT_TABLE_DOMAIN = 'tables.local'

const normalizeIdentityPart = (value, fallback) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || fallback
}

const buildStableTableLogin = ({ shopId, shopName, tableName }) => {
  const shopPart = shopId
    ? `shop-${normalizeIdentityPart(shopId, 'unknown')}`
    : normalizeIdentityPart(shopName, 'shop')
  const tablePart = normalizeIdentityPart(tableName, 'table')

  return `${tablePart}-${shopPart}`
}

const buildStableTableDomain = (shopName) => {
  const normalizedShopName = normalizeIdentityPart(shopName, '')

  return normalizedShopName ? `${normalizedShopName}.com` : DEFAULT_TABLE_DOMAIN
}

const buildStableTableEmail = ({ shopId, shopName, tableName }) =>
  `${buildStableTableLogin({ shopId, shopName, tableName })}@${buildStableTableDomain(shopName)}`

const buildTableAccessPath = (token) =>
  `/table-access/${encodeURIComponent(token || '')}`

const buildTableAccessUrl = (origin, token) =>
  `${String(origin || '').replace(/\/$/, '')}${buildTableAccessPath(token)}`

module.exports = {
  buildStableTableDomain,
  buildStableTableEmail,
  buildStableTableLogin,
  buildTableAccessPath,
  buildTableAccessUrl,
  normalizeIdentityPart,
}
