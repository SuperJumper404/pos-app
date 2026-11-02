async function decodeBlob(blob) {
  const url = URL.createObjectURL(blob)
  const image = new Image()
  try {
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Cette image ne peut pas être lue.')); image.src = url })
    return image
  } finally { URL.revokeObjectURL(url) }
}
async function buildWalletImageVariants(blob, { kind, decodeImage = decodeBlob, createCanvas = () => document.createElement('canvas') } = {}) {
  if (!['icon', 'logo', 'strip'].includes(kind)) throw new Error('Type de visuel invalide.')
  const image = await decodeImage(blob)
  if (!image.width || !image.height) throw new Error('Image invalide.')
  const [width, height] = { icon: [38, 38], logo: [160, 50], strip: [375, 144] }[kind]
  const result = []
  for (let scale = 1; scale <= 3; scale++) {
    const canvas = createCanvas(); canvas.width = width * scale; canvas.height = height * scale
    const ratio = Math.max(canvas.width / image.width, canvas.height / image.height)
    const sw = canvas.width / ratio; const sh = canvas.height / ratio
    canvas.getContext('2d').drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height)
    const variant = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!variant || variant.size > 2 * 1024 * 1024) throw new Error('Le visuel est trop volumineux. Choisissez une autre image.')
    result.push({ name: `${kind}${scale === 1 ? '' : `${scale}x`}`, blob: variant })
  }
  return result
}
module.exports = { buildWalletImageVariants }
