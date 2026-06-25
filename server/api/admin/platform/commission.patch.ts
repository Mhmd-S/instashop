import { z } from 'zod'
import { requireSuperadmin } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

const Body = z.object({ feeBps: z.number().int().min(0).max(10000) })

// Set the global platform commission (basis points). Superadmin-only.
export default defineEventHandler(async (event) => {
  const user = await requireSuperadmin(event)
  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid request' })
  const { error } = await supabaseAdmin(event)
    .from('platform_settings')
    .update({ fee_bps: parsed.data.feeBps, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', 1)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not update commission' })
  return { feeBps: parsed.data.feeBps }
})
