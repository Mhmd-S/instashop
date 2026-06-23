import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { buildAndPersistTheme } from '~~/server/utils/theme/build'

const MAX_BYTES = 4 * 1024 * 1024

// Upload a manual logo override and immediately rebuild the theme from it (the
// brand color re-derives the palette). The logo path is carried on the new theme
// version so future "Generate" calls keep using it.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 422, statusMessage: 'No file uploaded' })

  const type = file.type || ''
  if (!type.startsWith('image/')) throw createError({ statusCode: 422, statusMessage: 'File must be an image' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Logo too large (max 4MB)' })

  const admin = supabaseAdmin(event)
  const ext = (type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('+xml', '')
  const storagePath = `${storeId}/theme/logo-manual.${ext}`
  const { error } = await admin.storage
    .from('store-media')
    .upload(storagePath, file.data, { contentType: type, upsert: true })
  if (error) {
    console.error('[theme.logo]', error)
    throw createError({ statusCode: 500, statusMessage: 'Upload failed' })
  }
  const publicUrl = admin.storage.from('store-media').getPublicUrl(storagePath).data.publicUrl

  return await buildAndPersistTheme(event, storeId, { buf: Buffer.from(file.data), storagePath, publicUrl })
})
