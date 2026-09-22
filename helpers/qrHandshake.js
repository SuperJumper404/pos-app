const QR_HANDSHAKE_TIMEOUT_MS = 15000

const withTimeout = (promise, timeoutMs) => {
  let timer
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Le chargement de la session QR a expiré.'))
    }, timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

const runQrHandshake = ({
  authenticate,
  loadShop,
  loadProducts,
  loadServicePoints,
  timeoutMs = QR_HANDSHAKE_TIMEOUT_MS,
}) => withTimeout((async () => {
  const authenticated = await authenticate()
  if (!authenticated) {
    throw new Error('Impossible de restaurer la session QR.')
  }

  const loaders = [loadShop, loadProducts, loadServicePoints].filter(
    (loader) => typeof loader === 'function'
  )
  const results = await Promise.all(loaders.map((loader) => loader()))
  if (results.includes(false)) {
    throw new Error('Impossible de charger les données du restaurant.')
  }

  return { ready: true }
})(), timeoutMs)

module.exports = {
  QR_HANDSHAKE_TIMEOUT_MS,
  runQrHandshake,
}
