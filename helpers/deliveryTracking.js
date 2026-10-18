export function readTrackingFragment(browser) {
  const { location, history } = browser
  const raw = location.hash.slice(1)
  // Remove the secret from the current history entry before starting any I/O.
  history.replaceState(null, '', location.pathname + location.search)
  return /^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : null
}

export function buildTrackingApi({ baseURL, fetch: fetchRequest = window.fetch.bind(window) }) {
  const request = async (path, body, { bearer, customerSession, signal } = {}) => {
    const response = await fetchRequest(new URL(`/baseurl/api/v1${path}`, baseURL).href, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(customerSession ? { 'X-CSRF-Token': customerSession.csrfToken } : {}) },
      credentials: customerSession ? 'include' : 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      body: JSON.stringify(body), signal,
    })
    if (!response.ok) throw Object.assign(new Error('Suivi indisponible.'), { status: response.status })
    return (await response.json()).data
  }
  return {
    read: (token, signal) => request('/delivery/tracking/read', { token }, { signal }),
    rotate: ({ deliveryId, idempotencyKey, privateCheckoutContext, bearer, customerSession }) => {
      if (!/^[1-9]\d{0,19}$/.test(deliveryId)) throw new Error('Suivi indisponible.')
      const query = customerSession ? `?shopId=${encodeURIComponent(customerSession.shopId)}` : ''
      return request(`/deliveries/${deliveryId}/tracking-token${query}`, { idempotencyKey,
        ...(privateCheckoutContext ? { privateCheckoutContext } : {}) }, { bearer, customerSession })
    },
  }
}

export function startTrackingPoll({ token, api, document, onData, onError, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer = null
  let stopped = false
  let failures = 0
  let controller = null
  const clear = () => { if (timer !== null) clearTimer(timer); timer = null }
  const run = async () => {
    clear()
    if (stopped || document.hidden || controller) return
    const current = new AbortController()
    controller = current
    try {
      const view = await api.read(token, current.signal)
      if (stopped || document.hidden || current.signal.aborted) return
      failures = 0
      onData(view)
    } catch (error) {
      if (stopped || document.hidden || current.signal.aborted) return
      if ([400, 401, 403, 404, 410].includes(error.status)) stopped = true
      failures++
      onError(stopped)
    } finally {
      controller = null
      if (!stopped && !document.hidden) timer = setTimer(run, Math.min(15000 * (2 ** Math.max(0, failures - 1)), 60000))
    }
  }
  const visibility = () => {
    clear()
    if (document.hidden) { if (controller) controller.abort() }
    else if (!controller) run()
  }
  document.addEventListener('visibilitychange', visibility)
  run()
  return () => { stopped = true; token = null; clear(); if (controller) controller.abort(); document.removeEventListener('visibilitychange', visibility) }
}
