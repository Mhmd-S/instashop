import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { bustStoreCache } from '~~/server/utils/tenant'
import { mergeCheckoutConfig, MAX_CHECKOUT_QUESTIONS, MAX_OPTIONS, MAX_LABEL_LEN, MAX_OPTION_LEN } from '~~/shared/types/checkout'
import type { Json } from '~~/shared/types/database.types'

const Body = z.object({
  fields: z
    .array(
      z.object({
        key: z.enum(['name', 'phone', 'address', 'note']),
        enabled: z.boolean(),
        required: z.boolean(),
        position: z.number().int().min(0),
      }),
    )
    .max(8),
  questions: z
    .array(
      z
        .object({
          key: z.string().max(64).optional(),
          label: z.string().trim().min(1).max(MAX_LABEL_LEN),
          type: z.enum(['short_text', 'long_text', 'single_select', 'yes_no']),
          required: z.boolean(),
          position: z.number().int().min(0),
          options: z.array(z.string().trim().min(1).max(MAX_OPTION_LEN)).max(MAX_OPTIONS).optional(),
        })
        .superRefine((q, ctx) => {
          if (q.type === 'single_select' && !(q.options && q.options.length >= 1)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A dropdown needs at least one option', path: ['options'] })
          }
        }),
    )
    .max(MAX_CHECKOUT_QUESTIONS),
})

// Save the store's checkout-question config (owner/admin only). New questions get a
// stable server-generated key; mergeCheckoutConfig() then dedupes/normalizes before
// persisting. Busts the tenant cache so the storefront sees the change immediately.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid checkout configuration', data: parsed.error.flatten() })
  }

  // Assign a stable, unique key to every question (generate for new/invalid/dupes).
  const seen = new Set<string>()
  const questions = parsed.data.questions.map((q) => {
    let key = q.key && /^[a-z0-9-]{8,64}$/i.test(q.key) ? q.key : randomUUID()
    while (seen.has(key)) key = randomUUID()
    seen.add(key)
    return { ...q, key }
  })
  const config = mergeCheckoutConfig({ fields: parsed.data.fields, questions })

  const admin = supabaseAdmin(event)
  const { data: store } = await admin.from('stores').select('subdomain').eq('id', storeId).maybeSingle()
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const { error } = await admin
    .from('stores')
    .update({ checkout_config: config as unknown as Json })
    .eq('id', storeId)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not save checkout questions' })

  await bustStoreCache((store as { subdomain: string }).subdomain)
  return { ok: true, config }
})
