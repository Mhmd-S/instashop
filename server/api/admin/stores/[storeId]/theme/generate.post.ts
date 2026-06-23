import { requireStoreAccess } from '~~/server/utils/auth'
import { buildAndPersistTheme } from '~~/server/utils/theme/build'

// Generate a per-store theme entirely from the logo: its brand color seeds an
// accessible derived palette and Gemini picks fonts/mood from the logo image alone,
// all validated/clamped. Falls back to the default theme without a logo or Gemini key.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')
  return await buildAndPersistTheme(event, storeId)
})
