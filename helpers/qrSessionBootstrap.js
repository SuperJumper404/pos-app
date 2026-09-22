const createQrSessionBootstrap = ({ authenticate, loadInitialData }) => {
  let inFlight = null
  let inFlightToken = null
  let readyToken = null

  return (token) => {
    const normalizedToken = String(token || '').trim()
    if (!normalizedToken) {
      throw new Error('Token QR requis.')
    }

    if (readyToken === normalizedToken) {
      return { ready: true, reused: true }
    }

    if (inFlight && inFlightToken === normalizedToken) {
      return inFlight
    }

    inFlightToken = normalizedToken
    inFlight = (async () => {
      const authenticated = await authenticate(normalizedToken)
      if (authenticated === false) {
        throw new Error('Impossible de creer la session QR.')
      }

      const results = await loadInitialData()
      const failed = Array.isArray(results)
        ? results.includes(false)
        : results === false
      if (failed) {
        throw new Error('Impossible de charger les donnees du restaurant.')
      }

      readyToken = normalizedToken
      return { ready: true, reused: false }
    })().finally(() => {
      inFlight = null
      inFlightToken = null
    })

    return inFlight
  }
}

module.exports = { createQrSessionBootstrap }
