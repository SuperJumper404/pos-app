const assert = require('assert')
const { runQrHandshake } = require('../helpers/qrHandshake')

const events = []
runQrHandshake({
  authenticate: async () => events.push('authenticate') || true,
  loadShop: async () => events.push('shop') || true,
  loadProducts: async () => events.push('products') || true,
  timeoutMs: 100,
}).then((result) => {
  assert.deepStrictEqual(events, ['authenticate', 'shop', 'products'])
  assert.strictEqual(result.ready, true)

  return runQrHandshake({
    authenticate: async () => false,
    loadShop: async () => true,
    loadProducts: async () => true,
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
