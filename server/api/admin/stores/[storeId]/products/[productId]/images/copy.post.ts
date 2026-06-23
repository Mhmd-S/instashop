import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

const Body = z.object({ sourceImageIds: z.array(z.string().uuid()).min(1).max(50) })

// Reuse images from another product: copy each source image's storage object to a
// new path owned by THIS product and append a gallery row. Copying (not sharing the
// URL) keeps deletes safe — per-image delete removes the storage object, so a shared
// object would break whichever product still referenced it. Tenant-scoped: sources
// must belong to the same store.
function extFromPath(path: string): string {
  const base = path.split('/').pop() || ''
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg'
}

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const productId = getRouterParam(event, 'productId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid selection' })

  // Confirm the target product belongs to this store.
  const userDb = await serverSupabaseClient(event)
  const { data: prod } = await userDb
    .from('products')
    .select('id')
    .eq('store_id', storeId)
    .eq('id', productId)
    .maybeSingle()
  if (!prod) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  // Load the source images, store-scoped so a seller can only copy their own media.
  type SourceRow = {
    id: string
    storage_path: string
    alt: string | null
    is_video: boolean
    video_url: string | null
    phash: string | null
  }
  const { data: sources } = await userDb
    .from('product_images')
    .select('id, storage_path, alt, is_video, video_url, phash')
    .eq('store_id', storeId)
    .neq('product_id', productId) // reuse is from OTHER products; never self-duplicate
    .in('id', parsed.data.sourceImageIds)
  const sourceRows = (sources ?? []) as SourceRow[]
  if (!sourceRows.length) throw createError({ statusCode: 404, statusMessage: 'No images found' })

  // Preserve the order the seller selected them in.
  const order = new Map(parsed.data.sourceImageIds.map((id, i) => [id, i]))
  sourceRows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  const admin = supabaseAdmin(event)

  // Append after the current last image (first image of an empty gallery -> primary).
  const { data: last } = await admin
    .from('product_images')
    .select('position')
    .eq('product_id', productId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  let nextPos = ((last as { position?: number } | null)?.position ?? -1) + 1

  let copied = 0
  for (const [i, src] of sourceRows.entries()) {
    const ext = extFromPath(src.storage_path)
    const rand = Math.random().toString(36).slice(2, 8)
    const dest = `${storeId}/products/${productId}/${Date.now()}-${i}-${rand}.${ext}`

    const { error: copyErr } = await admin.storage.from('store-media').copy(src.storage_path, dest)
    if (copyErr) {
      console.error('[images.copy] storage copy failed', src.storage_path, copyErr)
      continue
    }
    const publicUrl = admin.storage.from('store-media').getPublicUrl(dest).data.publicUrl

    const { error: insErr } = await admin.from('product_images').insert({
      product_id: productId,
      store_id: storeId,
      storage_path: dest,
      public_url: publicUrl,
      position: nextPos,
      alt: src.alt,
      is_video: src.is_video,
      video_url: src.video_url,
      phash: src.phash,
    })
    if (insErr) {
      console.error('[images.copy] row insert failed', insErr)
      // Don't orphan the copied object if the row write failed.
      await admin.storage.from('store-media').remove([dest])
      continue
    }
    nextPos++
    copied++
  }

  if (!copied) throw createError({ statusCode: 500, statusMessage: 'Could not copy images' })

  // Manual curation: protect from AI re-sync auto-attach; mirror the primary image.
  await admin.from('products').update({ locked_by_seller: true }).eq('store_id', storeId).eq('id', productId)
  await admin.rpc('sync_primary_image', { p_product: productId, p_store: storeId })

  return { copied }
})
