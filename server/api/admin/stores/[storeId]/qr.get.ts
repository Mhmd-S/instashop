import QRCode from 'qrcode'
import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'

// A QR code pointing at the store's public storefront, for the seller to drop into
// IG Stories, packaging, or anywhere physical. Black-on-white for max scannability.
// Append ?download to get it as an attachment with a sensible filename.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data: store } = await db
    .from('stores')
    .select('subdomain')
    .eq('id', storeId)
    .maybeSingle()
  const subdomain = (store as { subdomain?: string } | null)?.subdomain
  if (!subdomain) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  // Same scheme as useSurfaceUrls(): http on local hosts, https everywhere else.
  const base = useRuntimeConfig(event).public.appBaseDomain
  const isLocal = base.includes('lvh.me') || base.startsWith('localhost') || base.startsWith('127.')
  const url = `${isLocal ? 'http' : 'https'}://${subdomain}.${base}`

  const png = await QRCode.toBuffer(url, { type: 'png', width: 512, margin: 1, errorCorrectionLevel: 'M' })

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  if (getQuery(event).download !== undefined) {
    setHeader(event, 'Content-Disposition', `attachment; filename="${subdomain}-storefront-qr.png"`)
  }
  return png
})
