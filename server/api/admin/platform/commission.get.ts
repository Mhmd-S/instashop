import { requireSuperadmin } from '~~/server/utils/auth'
import { getPlatformFeeBps } from '~~/server/utils/platformSettings'

// Read the global platform commission (basis points). Superadmin-only — sellers
// must never see or change it.
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  return { feeBps: await getPlatformFeeBps(event) }
})
