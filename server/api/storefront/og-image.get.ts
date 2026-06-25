import sharp from 'sharp'
import { FALLBACK_THEME } from '~~/shared/types/theme'
import { getActiveTheme } from '../../utils/theme/active'

// A branded 1200×630 social-preview card for the storefront link, generated from
// the store's theme palette + logo. This is what makes the link look like a real
// product (logo + name on-brand) instead of a squished avatar in a gray box when
// shared to a DM / IG bio link / WhatsApp. Cached hard, keyed on the active theme.
//
// Resilient by design: any failure falls back to the bare logo (302) or a plain
// card, so og:image is never broken.

const W = 1200
const H = 630

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;',
  )
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

export default defineEventHandler(async (event) => {
  const store = event.context.store
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  // Long-lived cache; a new theme gets a new id, so the etag changes on rebrand.
  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400')
  setHeader(event, 'ETag', `"og-${store.active_theme_id ?? 'none'}"`)

  const active = await getActiveTheme(event, store)
  const p = (active?.tokens ?? FALLBACK_THEME).palette
  const logoUrl = active?.logoUrl ?? null

  try {
    const host = getRequestHost(event)
    const name = truncate(store.name, 30)
    const fontSize = name.length > 18 ? 64 : 84

    // Card: brand background, accent bar, store name + the address, small wordmark.
    // Logo (if any) is composited in separately as a raster below.
    const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${p.bg}"/>
      <rect x="0" y="0" width="16" height="${H}" fill="${p.primary}"/>
      <text x="96" y="430" font-family="'DejaVu Sans','Helvetica Neue',Arial,sans-serif" font-size="${fontSize}" font-weight="700" fill="${p.fg}">${escapeXml(name)}</text>
      <text x="96" y="492" font-family="'DejaVu Sans','Helvetica Neue',Arial,sans-serif" font-size="32" fill="${p.muted}">${escapeXml(host)}</text>
      <circle cx="104" cy="552" r="7" fill="${p.primary}"/>
      <text x="122" y="561" font-family="'DejaVu Sans','Helvetica Neue',Arial,sans-serif" font-size="26" fill="${p.muted}">Powered by Chanis</text>
    </svg>`

    const composites: sharp.OverlayOptions[] = []
    if (logoUrl) {
      try {
        const bytes = await $fetch<ArrayBuffer>(logoUrl, { responseType: 'arrayBuffer' })
        const logo = await sharp(Buffer.from(bytes))
          .resize(176, 176, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
        composites.push({ input: logo, top: 110, left: 96 })
      } catch {
        // logo fetch/decode failed — render the text-only card.
      }
    }

    const png = await sharp(Buffer.from(svg)).composite(composites).png().toBuffer()
    return png
  } catch (err) {
    console.error('[og-image] generation failed', (err as Error)?.message)
    // Last resort: hand back the logo so the preview still has an image.
    if (logoUrl) return sendRedirect(event, logoUrl, 302)
    throw createError({ statusCode: 404, statusMessage: 'No preview image' })
  }
})
