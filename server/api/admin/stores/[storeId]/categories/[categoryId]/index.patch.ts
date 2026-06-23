import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

const Body = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

// Rename / re-describe / reorder a category. Slug stays stable on rename.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const categoryId = getRouterParam(event, 'categoryId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid input' })

  const update: Record<string, unknown> = {}
  for (const k of ['name', 'description', 'position'] as const) {
    if (k in parsed.data) update[k] = parsed.data[k]
  }
  if (Object.keys(update).length === 0) return { ok: true }

  const admin = supabaseAdmin(event)
  const { data, error } = await admin
    .from('categories')
    .update(update)
    .eq('store_id', storeId)
    .eq('id', categoryId)
    .select('id')
    .maybeSingle()

  if (error) throw createError({ statusCode: 400, statusMessage: 'Could not update category' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  return { ok: true }
})
