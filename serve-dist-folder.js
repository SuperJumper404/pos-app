const path = require('path')
const express = require('express')

const app = express()

const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || '0.0.0.0'

const distPath = path.join(__dirname, 'dist')
const indexPath = path.join(distPath, 'index.html')

// Log de chaque requête entrante
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`)
  next()
})

app.use(
  express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      console.log(`[STATIC] URL: ${res.req.originalUrl} -> FILE: ${filePath}`)
    },
  })
)

app.get('/{*splat}', (req, res) => {
  console.log(`[FALLBACK] URL: ${req.originalUrl} -> FILE: ${indexPath}`)
  res.sendFile(indexPath)
})

app.listen(PORT, HOST, (err) => {
  if (err) {
    console.error('Erreur au démarrage:', err)
    process.exit(1)
  }
  console.log(`Frontend servi sur http://${HOST}:${PORT}`)
})
