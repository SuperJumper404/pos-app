const assert = require('assert')
const { runQrHandshake } = require('../helpers/qrHandshake')

const events = []
runQrHandshake({
  authenticate: () => events.push('authenticate') || true,
  loadShop: () => events.push('shop') || true,
  loadProducts: () => events.push('products') || true,
  timeoutMs: 100,
}).then((result) => {
  assert.deepStrictEqual(events, ['authenticate', 'shop', 'products'])
  assert.strictEqual(result.ready, true)

  return runQrHandshake({
    authenticate: () => false,
    loadShop: () => true,
    loadProducts: () => true,
    timeoutMs: 100,
  })
}).then(() => {
  throw new Error('an unauthenticated QR handshake must fail')
}, (error) => {
  assert.match(error.message, /session QR/i)
  console.log('qr handshake tests passed')
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
