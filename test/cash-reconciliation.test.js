const assert = require('node:assert/strict')
const test = require('node:test')
const { parseDeclarationCents, reconciliationRows } = require('../helpers/cashReconciliation')
const { normalizePaymentSummary } = require('../helpers/paymentMethods')

test('count entry accepts French decimals and explicit zero without treating blank as zero', () => {
  for (const [input, expected] of [['12,34', 1234], ['12.34', 1234], [' 0 ', 0], ['12', 1200], ['0,01', 1]]) {
    assert.equal(parseDeclarationCents(input), expected)
  }
  for (const input of ['', ' ', null, '-1', '1,234', '12abc', 'Infinity', '1e2', {}, '9007199254740992']) {
    assert.equal(parseDeclarationCents(input), null)
  }
})

test('reconciliation retains negative differences and unknown historic declarations', () => {
  assert.deepEqual(reconciliationRows(null), [])
  assert.deepEqual(reconciliationRows({ expected_cash_cents: 1000, expected_card_cents: 2500,
    declared_cash_cents: 900, declared_card_cents: 2600, cash_difference_cents: -100, card_difference_cents: 100 }), [
    { key: 'cash', label: 'Espèces', expected: 1000, declared: 900, difference: -100 },
    { key: 'card', label: 'Carte', expected: 2500, declared: 2600, difference: 100 },
  ])
})

test('reports preserve separate TPE and online Stripe payment labels', () => {
  assert.deepEqual(normalizePaymentSummary([{ payment: 'TPE Stripe', total: 10 }, { payment: 'Stripe', total: 20 }]),
    [{ payment: 'TPE Stripe', total: 10 }, { payment: 'Stripe', total: 20 }])
})
