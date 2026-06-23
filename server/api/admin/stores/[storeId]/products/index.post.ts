import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import { slugify } from '~~/shared/utils/slug'

const Body = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(5000).nullable().optional(),
  price_minor: z.number().int().min(0).max(100_000_000),
  stock: z.number().int().min(0).nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }
  const body = parsed.data
  const db = await serverSupabaseClient(event)

  // product currency inherits the store's base currency
  const { data: store } = await db.from('stores').select('base_currency').eq('id', storeId).maybeSingle()
  const currency = (store as { base_currency?: string } | null)?.base_currency ?? 'USD'

  // unique slug within the store
  const base = slugify(body.title)
  let slug = base
  for (let i = 2; i < 100; i++) {
    const { data: clash } = await db
      .from('products')
      .select('id')
      .eq('store_id', storeId)
      .eq('slug', slug)
      .maybeSingle()
    if (!clash) break
    slug = `${base}-${i}`
  }

  const { data, error } = await db
    .from('products')
    .insert({
      store_id: storeId,
      source: 'manual',
      status: body.status,
      title: body.title,
      slug,
      description: body.description ?? null,
      price_minor: body.price_minor,
      currency,
      stock: body.stock ?? null,
    })
    .select('id, slug')
    .single()

  if (error) {
    console.error('[products.create]', error)
    throw createError({ statusCode: 400, statusMessage: 'Could not create product' })
  }
  return { product: data }
})
