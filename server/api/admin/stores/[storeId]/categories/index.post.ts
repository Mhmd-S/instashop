import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { slugify } from '~~/shared/utils/slug'

const Body = z.object({ name: z.string().trim().min(1).max(60), description: z.string().trim().max(500).optional() })

// Create a category (manual). Slug derived from name, made unique per store.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid category name' })
  const { name, description } = parsed.data

  const admin = supabaseAdmin(event)
  const base = slugify(name) || 'category'
  let slug = base
  for (let i = 2; i < 200; i++) {
    const { data: clash } = await admin
      .from('categories')
      .select('id')
      .eq('store_id', storeId)
      .eq('slug', slug)
      .maybeSingle()
    if (!clash) break
    slug = `${base}-${i}`
  }

  const { data: last } = await admin
    .from('categories')
    .select('position')
    .eq('store_id', storeId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const position = ((last as { position?: number } | null)?.position ?? -1) + 1

  const { data, error } = await admin
    .from('categories')
    .insert({ store_id: storeId, slug, name, description: description ?? null, source: 'manual', position })
    .select('id, slug, name, description, position, source')
    .single()

  if (error) {
    console.error('[categories.create]', error)
    throw createError({ statusCode: 400, statusMessage: 'Could not create category' })
  }
  return { category: data }
})
