import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'

// Payment states that count as money actually collected vs. still owed.
const PAID = new Set(['paid', 'partially_refunded'])
const PENDING = new Set(['unpaid', 'pending'])
const ALLOWED_DAYS = new Set([7, 30, 90])
const DAY_MS = 86_400_000

interface OrderRow {
  total_minor: number
  payment_status: string
  status: string
  placed_at: string
}

// Stripe-style sales metrics for one store, derived from the orders table.
// No GROUP BY/RPC — order volume per store is small, so we bucket in JS.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const q = getQuery(event)
  let days = Number(q.days) || 7
  if (!ALLOWED_DAYS.has(days)) days = 7

  const db = await serverSupabaseClient(event)

  // Currency is the store's base currency (orders may be empty, so don't derive it from them).
  const { data: store } = await db.from('stores').select('base_currency').eq('id', storeId).single()
  const currency = ((store as { base_currency?: string } | null)?.base_currency) || 'USD'

  // UTC day buckets, oldest .. today (inclusive).
  const now = new Date()
  const todayStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const startMs = todayStartMs - (days - 1) * DAY_MS
  const todayKey = new Date(todayStartMs).toISOString().slice(0, 10)
  const yesterdayKey = new Date(todayStartMs - DAY_MS).toISOString().slice(0, 10)

  // Fetch the current window plus the equally-long window before it, so we can show
  // "vs previous period" without a second query.
  const prevStartMs = startMs - days * DAY_MS
  const { data, error } = await db
    .from('orders')
    .select('total_minor, payment_status, status, placed_at')
    .eq('store_id', storeId)
    .gte('placed_at', new Date(prevStartMs).toISOString())
  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load metrics' })

  const buckets = new Map<string, { grossMinor: number; orders: number }>()
  for (let i = 0; i < days; i++) {
    const key = new Date(startMs + i * DAY_MS).toISOString().slice(0, 10)
    buckets.set(key, { grossMinor: 0, orders: 0 })
  }
  const startIso = new Date(startMs).toISOString()

  let grossMinor = 0
  let paidCount = 0
  let ordersCount = 0
  let pendingMinor = 0
  let todayMinor = 0
  let yesterdayMinor = 0
  let prevGrossMinor = 0
  let prevOrdersCount = 0

  for (const r of (data ?? []) as OrderRow[]) {
    const total = Number(r.total_minor) || 0
    const cancelled = r.status === 'cancelled'
    const paid = PAID.has(r.payment_status)

    // Previous window: only roll up gross + order count for the comparison.
    if (r.placed_at < startIso) {
      if (!cancelled) prevOrdersCount++
      if (paid) prevGrossMinor += total
      continue
    }

    const key = String(r.placed_at).slice(0, 10)
    const bucket = buckets.get(key)

    if (!cancelled) {
      ordersCount++
      if (bucket) bucket.orders++
    }

    if (paid) {
      grossMinor += total
      paidCount++
      if (bucket) bucket.grossMinor += total
      if (key === todayKey) todayMinor += total
      else if (key === yesterdayKey) yesterdayMinor += total
    } else if (PENDING.has(r.payment_status) && !cancelled) {
      pendingMinor += total
    }
  }

  const series = [...buckets.entries()].map(([date, v]) => ({
    date,
    grossMinor: v.grossMinor,
    orders: v.orders,
  }))
  const aovMinor = paidCount ? Math.round(grossMinor / paidCount) : 0
  const prevAovMinor = prevOrdersCount ? Math.round(prevGrossMinor / prevOrdersCount) : 0

  // Newest orders regardless of range, for the dashboard's "recent" list.
  const { data: recent } = await db
    .from('orders')
    .select('id, order_number, total_minor, currency, payment_status, status, contact_name, contact_email, placed_at')
    .eq('store_id', storeId)
    .order('placed_at', { ascending: false })
    .limit(5)

  return {
    currency,
    days,
    summary: {
      grossMinor, ordersCount, aovMinor, pendingMinor, todayMinor, yesterdayMinor,
      prevGrossMinor, prevOrdersCount, prevAovMinor,
    },
    series,
    recent: recent ?? [],
  }
})
