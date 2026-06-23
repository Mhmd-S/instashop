import { z } from 'zod'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { notifyNewOrder } from '~~/server/utils/email'
import {
  mergeCheckoutConfig,
  isAddressSatisfied,
  MAX_CHECKOUT_QUESTIONS,
  MAX_ANSWER_LEN,
  type BuiltinFieldKey,
  type CheckoutAnswer,
} from '~~/shared/types/checkout'

const Body = z.object({
  contact: z.object({
    email: z.string().email(),
    phone: z.string().max(40).optional(),
    name: z.string().max(120).optional(),
  }),
  ship: z
    .object({
      name: z.string().max(120).optional(),
      line1: z.string().max(200).optional(),
      line2: z.string().max(200).optional(),
      city: z.string().max(120).optional(),
      region: z.string().max(120).optional(),
      postcode: z.string().max(40).optional(),
      country: z.string().max(2).optional(),
    })
    .default({}),
  note: z.string().max(2000).optional(),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(999) }))
    .min(1)
    .max(100),
  idempotencyKey: z.string().min(8).max(100),
  paymentMethod: z.enum(['cod', 'stripe']).default('cod'),
  // Answers to the store's custom checkout questions; shape-only here, semantics
  // (required/type/anti-injection) are validated against the store's config below.
  customAnswers: z
    .array(z.object({ key: z.string().min(1).max(64), value: z.union([z.string().max(MAX_ANSWER_LEN), z.boolean()]) }))
    .max(MAX_CHECKOUT_QUESTIONS)
    .default([]),
})

// The single guest write path. Store is resolved from Host (NEVER the body, M9);
// place_order reprices every line server-side (H3) and is idempotent.
export default defineEventHandler(async (event) => {
  const store = event.context.store
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid checkout', data: parsed.error.flatten() })
  }
  const b = parsed.data

  // Card payments must be enabled for this store (gated on Stripe charges_enabled).
  if (b.paymentMethod === 'stripe' && !store.payment_methods?.includes('stripe')) {
    throw createError({ statusCode: 422, statusMessage: 'Card payments are not available for this store' })
  }

  // Config-driven checkout-question validation. Authoritative: read the trusted
  // config from the resolved store (never the client), enforce enabled+required
  // built-ins and required/typed custom answers, drop unknown keys, and re-stamp
  // label/type from config so the persisted snapshot can't be spoofed.
  const config = mergeCheckoutConfig(store.checkout_config)
  const missing: string[] = []
  const fieldByKey = new Map(config.fields.map((f) => [f.key, f]))
  const isRequired = (k: BuiltinFieldKey) => {
    const f = fieldByKey.get(k)
    return !!(f && f.enabled && f.required)
  }
  if (isRequired('name') && !b.contact.name?.trim()) missing.push('name')
  if (isRequired('phone') && !b.contact.phone?.trim()) missing.push('phone')
  if (isRequired('address') && !isAddressSatisfied(b.ship)) missing.push('address')
  if (isRequired('note') && !b.note?.trim()) missing.push('note')

  const submitted = new Map(b.customAnswers.map((a) => [a.key, a.value]))
  const customAnswers: CheckoutAnswer[] = []
  for (const q of config.questions) {
    const raw = submitted.get(q.key)
    if (q.type === 'yes_no') {
      const value = raw === true
      if (q.required && !value) missing.push(q.key)
      customAnswers.push({ key: q.key, label: q.label, type: q.type, value })
      continue
    }
    const text = typeof raw === 'string' ? raw.trim() : ''
    if (q.type === 'single_select' && text && !(q.options ?? []).includes(text)) {
      // A required dropdown with an invalid/stale value still blocks; an optional
      // one just drops the value (e.g. the owner edited options mid-session).
      if (q.required) missing.push(q.key)
      continue
    }
    if (!text) {
      if (q.required) missing.push(q.key)
      continue
    }
    customAnswers.push({ key: q.key, label: q.label, type: q.type, value: text.slice(0, MAX_ANSWER_LEN) })
  }
  if (missing.length) {
    throw createError({ statusCode: 422, statusMessage: 'Please answer the required questions', data: { fields: missing } })
  }

  // Disabled built-ins are authoritative: never persist a value for a field the
  // owner turned off, even if a stale form or non-conforming client still sends it.
  if (!fieldByKey.get('name')?.enabled) {
    b.contact.name = undefined
    b.ship.name = undefined
  }
  if (!fieldByKey.get('phone')?.enabled) b.contact.phone = undefined
  if (!fieldByKey.get('address')?.enabled) b.ship = {}
  if (!fieldByKey.get('note')?.enabled) b.note = undefined

  const admin = supabaseAdmin(event)
  const { data, error } = await admin.rpc('place_order', {
    p_store: store.id,
    p_idem: b.idempotencyKey,
    p_contact: b.contact,
    p_ship: b.ship,
    p_note: b.note ?? null,
    p_lines: b.items.map((i) => ({ product_id: i.productId, qty: i.quantity })),
    p_payment_method: b.paymentMethod,
    p_custom: customAnswers,
  })

  if (error) {
    const m = error.message || ''
    if (m.includes('STORE_INACTIVE')) throw createError({ statusCode: 404, statusMessage: 'Store unavailable' })
    if (m.includes('PRODUCT_UNAVAILABLE')) throw createError({ statusCode: 409, statusMessage: 'A product in your cart is no longer available' })
    if (m.includes('OUT_OF_STOCK')) throw createError({ statusCode: 409, statusMessage: 'A product in your cart is out of stock' })
    if (m.includes('BAD_QTY')) throw createError({ statusCode: 422, statusMessage: 'Invalid quantity' })
    if (m.includes('BAD_CUSTOM')) throw createError({ statusCode: 422, statusMessage: 'Invalid checkout answers' })
    console.error('[checkout] place_order', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not place order' })
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { order_id: string; order_number: string; access_token: string }
    | undefined
  if (!row) throw createError({ statusCode: 500, statusMessage: 'Could not place order' })

  // Best-effort new-order email to the store (no-op without RESEND configured).
  // For card orders we notify on payment instead (the Stripe webhook), so an
  // abandoned card attempt never emails the seller a phantom order.
  if (b.paymentMethod === 'cod') {
    const { data: s } = await admin.from('stores').select('notify_email').eq('id', store.id).maybeSingle()
    const notifyEmail = (s as { notify_email?: string | null } | null)?.notify_email
    if (notifyEmail) {
      const { data: ord } = await admin.from('orders').select('total_minor, currency').eq('id', row.order_id).maybeSingle()
      const o = ord as { total_minor?: number; currency?: string } | null
      void notifyNewOrder({
        to: notifyEmail,
        storeName: store.name,
        orderNumber: row.order_number,
        totalMinor: o?.total_minor ?? 0,
        currency: o?.currency ?? store.base_currency,
        customAnswers,
      })
    }
  }

  return { orderId: row.order_id, orderNumber: row.order_number, accessToken: row.access_token }
})
