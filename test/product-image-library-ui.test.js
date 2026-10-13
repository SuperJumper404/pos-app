/* eslint-disable no-console */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const newProduct = fs.readFileSync(
  path.join(__dirname, '..', 'pages', 'products', 'newproduct.vue'),
  'utf8'
)
const cropper = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'ImageCropper.vue'),
  'utf8'
)

assert.match(newProduct, /ProductImageLibraryPicker/)
assert.match(newProduct, /@select="useLibraryImage"/)
assert.match(newProduct, /ref="productImageCropper"/)
assert.match(newProduct, /v-dialog\s+v-model="imageLibraryDialog"/)
assert.match(newProduct, /@click="openImageLibrary"/)
assert.match(newProduct, /imageLibraryDialog: false/)
assert.match(newProduct, /loadFile\(file\)/)
assert.match(newProduct, /this\.imageLibraryDialog = false/)
assert.match(
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'components',
      'products',
      'ProductImageLibraryPicker.vue'
    ),
    'utf8'
  ),
  /prefix:\s*''/
)
assert.match(cropper, /loadFile\(file\)/)
assert.match(cropper, /this\.rawInput = file/)

console.log('product image library UI tests passed')
