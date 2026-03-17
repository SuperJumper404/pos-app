const path = require('path')
const express = require('express')

const app = express()
const PORT = process.env.PORT || 3000
const distPath = path.join(__dirname, 'dist')
console.log('Serving static files from:', distPath)
app.use(express.static(distPath))

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})
app.listen(PORT, () => {
  console.log(`Frontend servi sur le port ${PORT}`)
})
