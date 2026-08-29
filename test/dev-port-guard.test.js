const assert = require('assert')
const fs = require('fs')
const net = require('net')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const scriptPath = path.join(root, 'scripts', 'ensure-dev-port-free.js')
const packageJson = require('../package.json')

function runGuard(port) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    env: {
      ...process.env,
      POS_DEV_HOST: '127.0.0.1',
      POS_DEV_PORT: String(port),
    },
    encoding: 'utf8',
  })
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

;(async () => {
  assert.ok(fs.existsSync(scriptPath), 'dev port guard script must exist')

  const freePort = await getFreePort()
  const freeResult = runGuard(freePort)
  assert.strictEqual(freeResult.status, 0, freeResult.stderr)

  const occupiedPort = await getFreePort()
  const server = await listen(occupiedPort)
  try {
    const occupiedResult = runGuard(occupiedPort)
    assert.strictEqual(occupiedResult.status, 1)
    assert.match(
      occupiedResult.stderr,
      /port .*already in use/i,
      'occupied port must explain why dev cannot start'
    )
  } finally {
    server.close()
  }

  assert.match(packageJson.scripts.predev, /ensure-dev-port-free\.js/)
  assert.match(packageJson.scripts.test, /test\/dev-port-guard\.test\.js/)

  process.stdout.write('dev port guard tests passed\n')
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`)
  process.exit(1)
})
