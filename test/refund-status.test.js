const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ordersSource = fs.readFileSync(
  path.join(__dirname, '../store/orders.js'),
  'utf8'
)

const loadOrdersActions = () => {
  const executable = ordersSource
    .replace(/^import .*$/gm, '')
    .replace(/export const /g, 'const ')
    .concat('\nreturn { actions }')

  // eslint-disable-next-line no-new-func
  return new Function('EasyAccess', 'defaultMutations', executable)(
    () => ({}),
    () => ({})
  ).actions
}

const runRefund = async (refundStatus, message = 'API message') => {
  const dispatches = []
  const actions = loadOrdersActions()
  const result = await actions.refundStripeOrder.call(
    {
      $axios: {
        post: () =>
          Promise.resolve({
            data: {
              message,
              data: { refundStatus },
            },
          }),
      },
    },
    {
      dispatch: (type, payload, options) => {
        dispatches.push([type, payload, options])
      },
    },
    { id: 42 }
  )

  return { result, dispatches }
}

const runAssertions = async () => {
  const previousLocalStorage = global.localStorage
  global.localStorage = { getItem: () => 'token' }

  try {
    const succeeded = await runRefund('succeeded')
    assert.strictEqual(succeeded.result, true)
    assert.ok(
      succeeded.dispatches.some(
        ([type, message]) =>
          type === 'notifications/success' &&
          message === 'Commande remboursée.'
      )
    )

    for (const status of ['pending', 'requires_action']) {
      const pending = await runRefund(status)
      assert.strictEqual(pending.result, false)
      assert.ok(
        pending.dispatches.some(
          ([type]) => type === 'notifications/warning'
        )
      )
      assert.ok(
        !pending.dispatches.some(
          ([type]) => type === 'notifications/success'
        )
      )
    }

    for (const status of ['failed', 'canceled']) {
      const failed = await runRefund(status)
      assert.strictEqual(failed.result, false)
      assert.ok(
        failed.dispatches.some(([type]) => type === 'notifications/error')
      )
      assert.ok(
        !failed.dispatches.some(
          ([type]) => type === 'notifications/success'
        )
      )
    }
  } finally {
    global.localStorage = previousLocalStorage
  }

  console.log('refund status tests passed')
}

runAssertions().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
