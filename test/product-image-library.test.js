/* eslint-disable no-console */
const assert = require('assert')

const {
  buildSupabasePublicUrl,
  buildSupabaseObjectUrl,
  filterImageLibraryItems,
  imageLibraryConfig,
  normalizeSupabaseFile,
} = require('../helpers/productImageLibrary')

const files = [
  { name: 'Framboises fraiches.png', metadata: { mimetype: 'image/png' } },
  { name: 'Boisson cola.jpg', metadata: { mimetype: 'image/jpeg' } },
  { name: 'notes.txt', metadata: { mimetype: 'text/plain' } },
  { name: 'desserts', metadata: null },
]

assert.strictEqual(imageLibraryConfig({
  SUPABASE_URL: 'https://supabase.jokerlogics.com/',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_BUCKET: 'smarteat',
}).url, 'https://supabase.jokerlogics.com')

assert.throws(
  () => imageLibraryConfig({ SUPABASE_URL: '', SUPABASE_ANON_KEY: '', SUPABASE_BUCKET: '' }),
  /Configuration Supabase incomplete/
)

assert.deepStrictEqual(
  filterImageLibraryItems(files, 'fram').map((file) => file.name),
  ['Framboises fraiches.png']
)

assert.deepStrictEqual(
  filterImageLibraryItems(files, '').map((file) => file.name),
  ['Framboises fraiches.png', 'Boisson cola.jpg']
)

assert.strictEqual(
  buildSupabasePublicUrl({
    url: 'https://supabase.jokerlogics.com',
    bucket: 'smarteat',
    path: 'products/Framboises fraiches.png',
  }),
  'https://supabase.jokerlogics.com/storage/v1/object/public/smarteat/products/Framboises%20fraiches.png'
)

assert.strictEqual(
  buildSupabaseObjectUrl({
    url: 'https://supabase.jokerlogics.com',
    bucket: 'smarteat',
    path: 'products/Framboises fraiches.png',
  }),
  'https://supabase.jokerlogics.com/storage/v1/object/smarteat/products/Framboises%20fraiches.png'
)

assert.deepStrictEqual(
  normalizeSupabaseFile({ name: 'pizza.webp', id: '1' }, 'library'),
  {
    id: 'library/pizza.webp',
    name: 'pizza.webp',
    path: 'library/pizza.webp',
    title: 'pizza.webp',
    contentType: '',
  }
)

console.log('product image library tests passed')
