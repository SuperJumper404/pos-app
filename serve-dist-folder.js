const path = require('path')
const express = require('express')

const app = express()
const PORT = process.env.PORT || 3000
const distPath = path.join(__dirname, 'dist')
const indexPath = path.join(distPath, 'index.html')

app.use(express.static(distPath, { index: false }))

app.get('*', (req, res) => {
  res.sendFile(indexPath)
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend servi sur le port ${PORT}`)
})
