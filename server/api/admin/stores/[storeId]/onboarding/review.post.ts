import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

// Record that the seller has reviewed an auto-filled onboarding step (theme /
// products / branding). Stored as a jsonb map on the store; setup-status reads it
// and only marks those steps "done" once acknowledged.
const Body = z.object({
  step: z.enum(['theme', 'products', 'branding']),
  reviewed: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  // 'staff' to match setup-status and the underlying review actions (products PATCH,
  // branding hero are both 'staff') — recording "I reviewed this" must not require a
  // higher role than performing the review itself.
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid request' })
  const { step, reviewed } = parsed.data

  const admin = supabaseAdmin(event)
  const { data: store } = await admin
    .from('stores')
    .select('onboarding_reviewed')
    .eq('id', storeId)
    .maybeSingle()
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const current = ((store as { onboarding_reviewed?: Record<string, boolean> }).onboarding_reviewed) ?? {}
  const next = { ...current, [step]: reviewed }
  const { error } = await admin.from('stores').update({ onboarding_reviewed: next }).eq('id', storeId)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not save review state' })

  return { ok: true, onboarding_reviewed: next }
})
