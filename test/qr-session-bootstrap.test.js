const assert = require('assert')
const { createQrSessionBootstrap } = require('../helpers/qrSessionBootstrap')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function run() {
  let authenticateCalls = 0
  let loadCalls = 0
  const bootstrap = createQrSessionBootstrap({
    authenticate: async () => {
      authenticateCalls += 1
      await wait(5)
      return true
    },
    loadInitialData: async () => {
      loadCalls += 1
      await wait(5)
      return [true, true, true]
    },
  })

  const [first, second] = await Promise.all([
    bootstrap('qr-token'),
    bootstrap('qr-token'),
  ])

  assert.deepStrictEqual(first, { ready: true, reused: false })
  assert.deepStrictEqual(second, { ready: true, reused: false })
  assert.strictEqual(authenticateCalls, 1)
  assert.strictEqual(loadCalls, 1)

  const reused = await bootstrap('qr-token')
  assert.deepStrictEqual(reused, { ready: true, reused: true })
  assert.strictEqual(authenticateCalls, 1)
  assert.strictEqual(loadCalls, 1)

  const nextToken = await bootstrap('next-token')
  assert.deepStrictEqual(nextToken, { ready: true, reused: false })
  assert.strictEqual(authenticateCalls, 2)
  assert.strictEqual(loadCalls, 2)

  console.log('qr session bootstrap tests passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
