import { serverSupabaseClient } from '#supabase/server'
import type { StorefrontCategory } from '~~/shared/types/category'

// Categories that have at least one published product (anon + RLS).
export default defineEventHandler(async (event) => {
  const store = event.context.store
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const db = await serverSupabaseClient(event)

  const { data: pub } = await db
    .from('products')
    .select('id')
    .eq('store_id', store.id)
    .eq('status', 'published')
  const pubIds = ((pub ?? []) as { id: string }[]).map((p) => p.id)
  if (!pubIds.length) return { categories: [] as StorefrontCategory[] }

  const { data: links } = await db
    .from('product_categories')
    .select('category_id')
    .eq('store_id', store.id)
    .in('product_id', pubIds)
  const catIds = [...new Set(((links ?? []) as { category_id: string }[]).map((l) => l.category_id))]
  if (!catIds.length) return { categories: [] as StorefrontCategory[] }

  const { data: cats } = await db
    .from('categories')
    .select('slug, name')
    .eq('store_id', store.id)
    .in('id', catIds)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  return { categories: (cats ?? []) as unknown as StorefrontCategory[] }
})
