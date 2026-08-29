const assert = require('assert')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../store/users.js'), 'utf8')
const start = source.indexOf('postLogin({ dispatch }, params)')
const end = source.indexOf('postTableAccess', start)
const postLogin = source.slice(start, end)

assert.ok(start >= 0, 'postLogin action must exist')
assert.match(
  postLogin,
  /error\.response\?\.\s*data\?\.\s*message/,
  'postLogin must tolerate Axios errors without response payloads'
)
assert.match(postLogin, /Connexion impossible\./)
assert.doesNotMatch(
  postLogin,
  /error\.response\.data\.message/,
  'postLogin must not dereference error.response.data directly'
)

console.log('login error handling tests passed')
