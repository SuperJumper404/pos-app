const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../store/categories.js'), 'utf8')
const start = source.indexOf('getAllCategories({ dispatch })')
const end = source.indexOf('getDetailCategory', start)
const getAllCategories = source.slice(start, end)

assert.ok(start >= 0, 'getAllCategories action must exist')
assert.match(
  getAllCategories,
  /error\.response\?\.\s*data\?\.\s*message/,
  'getAllCategories must tolerate Axios errors without response payloads'
)
assert.match(getAllCategories, /indisponibles\./)
assert.doesNotMatch(
  getAllCategories,
  /error\.response\.data\.(data|message)/,
  'getAllCategories must not dereference error.response.data directly'
)

console.log('categories error handling tests passed')
