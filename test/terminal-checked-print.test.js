const assert = require('assert')
const { buildCardTicketPayload, sendCardTicket } = require('../helpers/cardTicket')
const payload = buildCardTicketPayload({ payment: { id: 81, amountCents: 1200 } })
const main = async () => {
  await assert.rejects(async () => { await sendCardTicket({ payload, checked: true,
    smartPrint: true, printerIp: '192.168.1.2', fetchImplementation: () => Promise.resolve({ ok: false }) }) }, /impression/i)
  let finish
  const pending = new Promise(resolve => { finish = resolve })
  const names = []
  const result = sendCardTicket({ payload, checked: true, dispatch: (name, job) => { names.push(name); assert.strictEqual(job.terminalPaymentId, 81); return pending } })
  assert.strictEqual(typeof result.then, 'function')
  await Promise.resolve()
  assert.strictEqual(names[0], 'printing/postPrintingJobChecked')
  finish(true)
  assert.strictEqual(await result, true)
  await assert.rejects(async () => { await sendCardTicket({ payload, checked: true, dispatch: () => Promise.reject(new Error('Transport impression indisponible')) }) }, /indisponible/)
  assert.strictEqual(sendCardTicket({ payload, dispatch: () => pending }), true, 'settlement printing keeps its nonblocking contract')
  console.log('Checked terminal printing passed')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
