import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { selectHero } from '~~/server/utils/theme/hero'

const Body = z.object({ force: z.boolean().optional() })

// Auto-pick the storefront hero image: AI-scores the store's branding posts and
// product photos for hero-suitability and flags the best one. Drives the theme
// editor's "Auto-pick hero" button. Pass { force: true } to re-pick even when a hero
// is already set (otherwise a manual/settled hero is left untouched).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event).catch(() => ({})))
  const force = parsed.success ? !!parsed.data.force : false

  return await selectHero(event, storeId, { force })
})
