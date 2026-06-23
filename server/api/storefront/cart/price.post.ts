import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const Body = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(999) }))
    .max(100),
})

// Revalidate cart line prices/availability against the live catalog (UX only — the
// server reprices again in place_order; this is never trusted).
export default defineEventHandler(async (event) => {
  const store = event.context.store
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid cart' })
  const items = parsed.data.items

  const ids = [...new Set(items.map((i) => i.productId))]
  const db = await serverSupabaseClient(event)
  const { data } = ids.length
    ? await db
        .from('products')
        .select('id, title, price_minor, currency, image_url')
        .eq('store_id', store.id)
        .in('id', ids)
    : { data: [] }

  // RLS returns only published rows of the active store; absence => unavailable.
  const byId = new Map((data ?? []).map((p) => [p.id as string, p]))
  const lines = items.map((i) => {
    const p = byId.get(i.productId) as
      | { title: string; price_minor: number; currency: string; image_url: string | null }
      | undefined
    return {
      productId: i.productId,
      quantity: i.quantity,
      available: !!p,
      title: p?.title ?? null,
      unitPriceMinor: p?.price_minor ?? 0,
      currency: p?.currency ?? store.base_currency,
      image_url: p?.image_url ?? null,
    }
  })
  const subtotalMinor = lines.reduce((n, l) => n + (l.available ? l.unitPriceMinor * l.quantity : 0), 0)
  return { lines, subtotalMinor, currency: store.base_currency }
})
