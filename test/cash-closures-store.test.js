const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(__dirname, '../store/cashClosures.js'),
  'utf8'
)

assert.ok(source.includes('current: null'))
assert.ok(source.includes('history: []'))
assert.ok(source.includes('detail: null'))
assert.ok(source.includes('getCurrent'))
assert.ok(source.includes('/baseurl/api/v1/reports/z/current'))
assert.ok(source.includes('closeCurrent'))
assert.ok(source.includes('/baseurl/api/v1/reports/z/close'))
assert.ok(source.includes('getHistory'))
assert.ok(source.includes('/baseurl/api/v1/reports/z'))
assert.ok(source.includes('getDetail'))
// eslint-disable-next-line no-template-curly-in-string
assert.ok(source.includes('/baseurl/api/v1/reports/z/${params}'))
assert.ok(source.includes('notifications/success'))
assert.ok(source.includes('notifications/error'))

// eslint-disable-next-line no-console
console.log('cash closures store tests passed')
