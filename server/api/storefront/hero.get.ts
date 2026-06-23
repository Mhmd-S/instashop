import { serverSupabaseClient } from '#supabase/server'

// The store's chosen hero image (a branding post marked used_as='hero'). Anon +
// RLS only exposes branding rows with used_as set on an active store.
export default defineEventHandler(async (event) => {
  const store = event.context.store
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const db = await serverSupabaseClient(event)
  const { data } = await db
    .from('branding_assets')
    .select('public_url, caption')
    .eq('store_id', store.id)
    .eq('used_as', 'hero')
    .not('public_url', 'is', null)
    .limit(1)
    .maybeSingle()

  return { hero: (data as { public_url: string; caption: string | null } | null) ?? null }
})
