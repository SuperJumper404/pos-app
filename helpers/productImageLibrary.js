const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '')

const imageLibraryConfig = (env = {}) => {
  const url = trimTrailingSlash(env.SUPABASE_URL)
  const anonKey = String(env.SUPABASE_ANON_KEY || '').trim()
  const bucket = String(env.SUPABASE_BUCKET || '').trim()

  if (!url || !anonKey || !bucket) {
    throw new Error('Configuration Supabase incomplete.')
  }

  return { url, anonKey, bucket }
}

const normalizeSupabaseFile = (file, prefix = '') => {
  const name = String((file && file.name) || '').trim()
  const normalizedPrefix = String(prefix || '').replace(/^\/+|\/+$/g, '')
  const path = normalizedPrefix ? `${normalizedPrefix}/${name}` : name
  const metadata = (file && file.metadata) || {}

  return {
    id: path,
    name,
    path,
    title: name,
    contentType: metadata.mimetype || metadata.contentType || '',
  }
}

const isImageFile = (file) => {
  if (!file || !file.name) return false
  const contentType = String(file.contentType || '').toLowerCase()
  if (contentType.startsWith('image/')) return true

  const extension = String(file.name).split('.').pop().toLowerCase()
  return IMAGE_EXTENSIONS.has(extension)
}

const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()

const filterImageLibraryItems = (files, search) => {
  const query = normalizeSearchText(search)

  return (Array.isArray(files) ? files : [])
    .map((file) => normalizeSupabaseFile(file))
    .filter(isImageFile)
    .filter((file) => !query || normalizeSearchText(file.title).includes(query))
}

const encodeStoragePath = (path) =>
  String(path || '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')

const buildSupabasePublicUrl = ({ url, bucket, path }) =>
  `${trimTrailingSlash(url)}/storage/v1/object/public/${encodeURIComponent(
    bucket
  )}/${encodeStoragePath(path)}`

const buildSupabaseObjectUrl = ({ url, bucket, path }) =>
  `${trimTrailingSlash(url)}/storage/v1/object/${encodeURIComponent(
    bucket
  )}/${encodeStoragePath(path)}`

module.exports = {
  buildSupabaseObjectUrl,
  buildSupabasePublicUrl,
  filterImageLibraryItems,
  imageLibraryConfig,
  normalizeSupabaseFile,
}
