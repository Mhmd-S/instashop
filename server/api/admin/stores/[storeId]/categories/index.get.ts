import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import type { CategoryWithCount } from '~~/shared/types/category'

interface Row {
  id: string
  slug: string
  name: string
  description: string | null
  position: number
  source: 'ai' | 'manual'
  product_categories: { count: number }[]
}

// List a store's categories with their product counts (admin).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const admin = supabaseAdmin(event)
  const { data, error } = await admin
    .from('categories')
    .select('id, slug, name, description, position, source, product_categories(count)')
    .eq('store_id', storeId)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load categories' })

  const categories: CategoryWithCount[] = ((data ?? []) as unknown as Row[]).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    position: c.position,
    source: c.source,
    product_count: c.product_categories?.[0]?.count ?? 0,
  }))
  return { categories }
})
