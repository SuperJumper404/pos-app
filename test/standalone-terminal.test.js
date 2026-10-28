const assert = require('assert')
const fs = require('fs')
const path = require('path')
const helper = path.resolve(__dirname, '../helpers/standaloneTerminal.js')
assert.ok(fs.existsSync(helper), 'Standalone amount and recovery helpers must exist')
const {
  appendAmountDigit, removeAmountDigit, formatTerminalAmount, validStandalonePayment,
  attemptStorageKey, readAttempt, saveAttempt, canUseStandaloneTerminal,
} = require(helper)

let amount = 0
for (const key of ['1', '2', '5', '0']) amount = appendAmountDigit(amount, key)
assert.strictEqual(amount, 1250)
assert.strictEqual(formatTerminalAmount(amount), '12,50')
assert.strictEqual(removeAmountDigit(amount), 125)
assert.strictEqual(appendAmountDigit(9999999, '9'), 99999999)
assert.strictEqual(appendAmountDigit(99999999, '9'), 99999999)
assert.strictEqual(appendAmountDigit(1250, 'e'), 1250)
assert.strictEqual(appendAmountDigit(1250, '-'), 1250)
assert.strictEqual(removeAmountDigit(0), 0)

const payment = { id: 21, paymentKind: 'standalone', readerId: 7, status: 'succeeded',
  amountCents: 5000, currency: 'eur', createdAt: '2026-10-28T12:00:00Z',
  confirmedAt: '2026-10-28T12:01:00Z', failureCode: null, failureMessage: null,
  cardTicket: null, attachmentsCount: 0 }
assert.strictEqual(validStandalonePayment(payment), true, 'Paid standalone needs no order allocations')
for (const patch of [{ amountCents: 49 }, { amountCents: 12.5 }, { amountCents: 100000000 },
  { paymentKind: 'order' }, { currency: 'usd' }, { id: -1 }, { status: 'paid' },
  { attachmentsCount: -1 }, { confirmedAt: 'bad-date' }]) {
  assert.strictEqual(validStandalonePayment({ ...payment, ...patch }), false)
}

const values = new Map()
const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) }
const key = attemptStorageKey({ shopid: 7, id: 4 })
assert.notStrictEqual(key, attemptStorageKey({ shopid: 7, id: 5 }))
assert.notStrictEqual(key, attemptStorageKey({ shopid: 8, id: 4 }))
assert.strictEqual(attemptStorageKey({ shopid: null, id: 4 }), null)
const attempt = { attemptKey: '11111111-1111-4111-8111-111111111111', amountCents: 5000, paymentId: null }
assert.strictEqual(saveAttempt(storage, key, { ...attempt, secret: 'do not persist' }), true)
assert.deepStrictEqual(readAttempt(storage, key), attempt)
assert.ok(!values.get(key).includes('secret'))
values.set(key, '{bad json')
assert.strictEqual(readAttempt(storage, key), null)
assert.strictEqual(saveAttempt({ setItem() { throw new Error('full') } }, key, attempt), false)

const user = { id: 4, shopid: 7, access: 1, module_permissions: ['cashregister'] }
const reader = { id: 7, status: 'online', isActive: true, assignedUserId: 4 }
assert.strictEqual(canUseStandaloneTerminal({ user, reader, path: '/history' }), true)
assert.strictEqual(canUseStandaloneTerminal({ user, reader, path: '/' }), true)
for (const route of ['/login', '/borne', '/cart', '/click-and-collect', '/ordersStatuses', '/table-access/x']) {
  assert.strictEqual(canUseStandaloneTerminal({ user, reader, path: route }), false)
}
assert.strictEqual(canUseStandaloneTerminal({ user, reader: { ...reader, assignedUserId: 5 }, path: '/' }), false)
assert.strictEqual(canUseStandaloneTerminal({ user, reader: { ...reader, status: 'offline' }, path: '/' }), false)
assert.strictEqual(canUseStandaloneTerminal({ user, reader: null, path: '/history', hasRecovery: true }), true)
assert.strictEqual(canUseStandaloneTerminal({ user: { ...user, access: 2 }, reader, path: '/' }), false)
assert.strictEqual(canUseStandaloneTerminal({ user: { ...user, module_permissions: [] }, reader, path: '/' }), false)
console.log('PASS standalone cent amounts, DTO, recovery and terminal access')
