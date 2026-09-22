const assert = require('assert')
const fs = require('fs')

const page = fs.readFileSync('pages/table-access/_token.vue', 'utf8')
const failurePage = fs.readFileSync('pages/qr-scan-failed.vue', 'utf8')
const axiosPlugin = fs.readFileSync('plugins/axios.js', 'utf8')

assert.ok(!page.includes('to="/login"'))
assert.ok(page.includes('to="/qr-scan-failed"'))
assert.match(failurePage, /Scannez .* nouveau .*QR code/i)
assert.match(failurePage, /layout: 'empty'/)
assert.ok(!failurePage.includes("middleware: 'auth'"))
assert.ok(axiosPlugin.includes("redirect('/qr-scan-failed')"))
assert.match(axiosPlugin, /isTableAccessAttempt/)
assert.ok(page.includes("bootstrapTableAccess"))
assert.ok(fs.readFileSync('store/users.js', 'utf8').includes("shop/getCurrentShopInfo"))
assert.ok(fs.readFileSync('store/users.js', 'utf8').includes("products/getProducts"))

console.log('table access failure page tests passed')
