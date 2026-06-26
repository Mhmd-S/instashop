import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { createManualProduct } from '~~/server/utils/ig/manualImport'
import { parseIgUrl } from '~~/shared/utils/igUrl'

// No-OAuth import: create one draft product from a pasted Instagram post link and/or
// its caption. AI (when configured) writes the title, description, price, and
// categories from the caption; the seller adds the photo on the product editor next.
// A title or caption is required so the product has a name to work from.
const Body = z
  .object({
    url: z.string().trim().max(2048).optional(),
    caption: z.string().trim().max(4000).optional(),
    title: z.string().trim().max(140).optional(),
    price: z.number().min(0).max(1_000_000).optional(), // major units; converted to minor below
  })
  .refine((b) => !!(b.caption?.trim() || b.title?.trim()), {
    message: 'Add a caption or a title so we have something to work from',
  })

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }
  const body = parsed.data

  // A link is optional, but when given it must be a real IG post URL — we keep it as
  // provenance only (no media is fetched from it).
  let permalink: string | null = null
  if (body.url) {
    const link = parseIgUrl(body.url)
    if (!link) throw createError({ statusCode: 422, statusMessage: "That doesn't look like an Instagram post link" })
    permalink = link.permalink
  }

  const result = await createManualProduct(event, storeId, {
    caption: body.caption ?? '',
    permalink,
    title: body.title ?? null,
    priceMinor: body.price != null ? Math.round(body.price * 100) : null,
  })

  return { product: { id: result.id, slug: result.slug }, title: result.title, usedAi: result.usedAi }
})
