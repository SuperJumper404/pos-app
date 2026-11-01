const assert = require('node:assert/strict')
const { test } = require('node:test')
let images = {}
try { images = require('../helpers/loyaltyWalletImages') } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error }
test('wallet image export produces the three actual PNG variants and crops to the requested frame', async () => {
  assert.equal(typeof images.buildWalletImageVariants, 'function')
  const draws = []
  const variants = await images.buildWalletImageVariants(new Blob(['image']), { kind: 'strip',
    decodeImage: async () => ({ width: 1600, height: 900 }),
    createCanvas: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: (...args) => draws.push(args) }),
      toBlob(callback, mime) { callback(new Blob([JSON.stringify([this.width, this.height])], { type: mime })) } }),
  })
  assert.deepEqual(variants.map(v => v.name), ['strip', 'strip2x', 'strip3x'])
  assert.deepEqual(await Promise.all(variants.map(async v => JSON.parse(await v.blob.text()))), [[375, 144], [750, 288], [1125, 432]])
  assert(variants.every(v => v.blob.type === 'image/png'))
  assert(draws[0][2] > 0, 'portrait overflow is cropped from the center')
})
