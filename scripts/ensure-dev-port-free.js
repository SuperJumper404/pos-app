const net = require('net')

const host = process.env.POS_DEV_HOST || 'localhost'
const port = Number(process.env.POS_DEV_PORT || process.env.PORT || 8083)

if (!Number.isInteger(port) || port <= 0) {
  process.stderr.write(`[dev] Invalid POS_DEV_PORT/PORT value: ${port}\n`)
  process.exit(1)
}

const server = net.createServer()

server.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    process.stderr.write(
      `[dev] Port ${port} is already in use on ${host}. Stop the existing Nuxt server before running npm run dev again.\n`
    )
    process.exit(1)
  }

  process.stderr.write(
    `[dev] Unable to check port ${port} on ${host}: ${error.message}\n`
  )
  process.exit(1)
})

server.once('listening', () => {
  server.close(() => process.exit(0))
})

server.listen(port, host)
