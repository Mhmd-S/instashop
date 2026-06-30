<script setup lang="ts">
import type { DesignTokens } from '~~/shared/types/theme'
import {
  ALLOWED_BODY_FONTS,
  ALLOWED_BUTTON,
  ALLOWED_CARD_HOVER,
  ALLOWED_DENSITY,
  ALLOWED_HEADING_FONTS,
  ALLOWED_HERO,
  ALLOWED_LAYOUT,
  ALLOWED_MOOD,
  ALLOWED_PRODUCT_CARD,
  ALLOWED_RADIUS,
  FALLBACK_THEME,
} from '~~/shared/types/theme'
// Same token→CSS maps the storefront uses, so the preview renders exactly what the
// live store will (corners, shadow, density). googleFontLinks loads the chosen
// Google fonts into the admin so the preview shows the real typefaces.
import { DENSITY_MAP, RADIUS_MAP, SHADOW_MAP, googleFontLinks } from '~~/shared/theme/cssVars'
import type { AdminProduct } from '~~/shared/types/product'
import { formatPrice } from '~~/shared/types/product'

// Self-contained theme review/editor. Rendered both on the standalone Theme page
// and inline in the onboarding wizard, so the review never bounces to a separate
// design. Non-blocking fetch (no top-level await) so it can mount lazily anywhere.
//
// Layout: a split workspace — scrollable settings on the left, a STICKY live
// storefront preview on the right (collapsing to a single stacked column below lg
// and whenever `embedded`, so the width-constrained onboarding wizard stays usable).
//
// `embedded` is set when rendered inline in the onboarding wizard: it drops the
// editor's own Save button (the wizard's Next button drives the save via the
// exposed save() below), stays quiet on success since we advance away, and forces
// the single-column (non-split) layout since the wizard caps width at max-w-3xl.
const props = defineProps<{ storeId: string; embedded?: boolean }>()

const { data, refresh, pending } = useFetch(`/api/admin/stores/${props.storeId}/theme`, {
  lazy: true,
  getCachedData: () => undefined,
})
const version = computed(() => data.value?.version ?? null)
const logoUrl = computed(() => data.value?.logoUrl ?? null)
const logoSource = computed(() => data.value?.logo?.source ?? null)
const { storeUrl } = useSurfaceUrls()
// Faux browser-chrome URL for the preview frame — real host from the runtime config
// (so it reads e.g. your-shop.chanis.shop in prod, your-shop.lvh.me in dev).
const previewHost = computed(() =>
  storeUrl(data.value?.subdomain || 'your-shop').replace(/^https?:\/\//, '').replace(/\/$/, ''),
)

// The seller's own products (set in the previous onboarding step) drive the preview
// grid, so it shows their real catalogue. Real products (image-first) come first;
// padded with samples so the grid always demonstrates wrapping. Non-blocking, like
// the theme fetch.
const { data: productData } = useFetch(`/api/admin/stores/${props.storeId}/products`, {
  lazy: true,
  getCachedData: () => undefined,
})
interface PreviewItem { title: string; price: string; image: string | null }
const SAMPLE_TITLES = ['Studio piece', 'New arrival', 'Best seller', 'Limited run', 'Everyday staple', 'Signature item']
const previewItems = computed<PreviewItem[]>(() => {
  const list: AdminProduct[] = productData.value?.products ?? []
  const currency = list[0]?.currency ?? 'USD'
  const sorted = [...list].sort((a, b) => Number(!!b.image_url) - Number(!!a.image_url))
  const items: PreviewItem[] = sorted.slice(0, 6).map((p) => ({
    title: p.title || 'Sample product',
    price: formatPrice(p.price_minor, p.currency),
    image: p.image_url ?? null,
  }))
  for (let i = items.length; i < 6; i++) {
    items.push({ title: SAMPLE_TITLES[i] ?? 'Sample product', price: formatPrice(4800 + i * 600, currency), image: null })
  }
  return items
})
// The store's real branding assets (IG-imported posts + any auto-selected product
// hero). Drives the hero manager below AND the preview's hero image, so the preview
// shows the actual hero the storefront serves — not a guess from the first product.
const { data: brandingData, refresh: refreshBranding } = useFetch(`/api/admin/stores/${props.storeId}/branding`, {
  lazy: true,
  getCachedData: () => undefined,
})
const brandingAssets = computed(() => brandingData.value?.assets ?? [])
const currentHero = computed(() => brandingAssets.value.find((a) => a.used_as === 'hero') ?? null)
// Manual-override choices: imported posts that have an image. The product-derived hero
// row (source==='product') is the automatic fallback, not offered as a manual pick.
const heroCandidates = computed(() => brandingAssets.value.filter((a) => a.public_url && a.source !== 'product'))

// Preview hero: the real chosen hero, falling back to the first product photo so an
// image-led hero variant still demonstrates before a hero is chosen.
const heroImage = computed(() => currentHero.value?.public_url ?? previewItems.value.find((p) => p.image)?.image ?? null)

// --- editable state, seeded from the active theme ---
const COLOR_KEYS = ['primary', 'secondary', 'accent', 'bg', 'fg', 'muted', 'card', 'border'] as const
type ColorKey = (typeof COLOR_KEYS)[number]
const colors = reactive<Record<ColorKey, string>>({ ...FALLBACK_THEME.palette })

// Only the colors a seller meaningfully tunes are shown. secondary/card/border keep
// their auto-derived values (still saved + applied to the store) — surfacing them
// just added noise. Order matches the storefront's visual hierarchy.
const VISIBLE_COLORS = [
  { key: 'primary', label: 'Primary' },
  { key: 'accent', label: 'Accent' },
  { key: 'bg', label: 'Background' },
  { key: 'fg', label: 'Text' },
  { key: 'muted', label: 'Muted text' },
] as const satisfies ReadonlyArray<{ key: ColorKey; label: string }>
const heading = ref<string>('Inter')
const body = ref<string>('Inter')
const radius = ref<string>('md')
const density = ref<string>('comfortable')
const buttonStyle = ref<string>('solid')
const shadow = ref<string>('subtle')
const mood = ref<string[]>([])
// Structural art direction (the part the model picks from the shop's post identity).
const layout = ref<string>('catalog')
const heroStyle = ref<string>('split')
const productCard = ref<string>('square')
const cardHover = ref<string>('lift')
// Section composition isn't edited inline here (the website builder owns it); the
// loaded order is preserved verbatim on save, and per-section `sections` config is
// preserved server-side (index.put.ts merges it from the current theme).
let sectionOrder: DesignTokens['artDirection']['sectionOrder'] = ['hero', 'shopByCategory', 'products']

function loadFrom(t: DesignTokens) {
  for (const k of COLOR_KEYS) colors[k] = t.palette[k]
  heading.value = t.typography.heading
  body.value = t.typography.body
  radius.value = t.radius
  density.value = t.density
  buttonStyle.value = t.buttonStyle
  shadow.value = t.shadow
  mood.value = [...t.mood]
  const ad = t.artDirection ?? FALLBACK_THEME.artDirection
  layout.value = ad.layout
  heroStyle.value = ad.hero
  productCard.value = ad.productCard
  cardHover.value = ad.cardHover
  sectionOrder = [...ad.sectionOrder]
}
watch(
  () => data.value?.tokens,
  (t) => {
    if (t) loadFrom(t as DesignTokens)
  },
  { immediate: true },
)

// --- WCAG contrast (client copy of contrast.ts) ---
function lum(hex: string): number {
  const h = hex.replace('#', '')
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!
}
function ratio(a: string, b: string): number {
  const la = lum(a)
  const lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
const fgContrast = computed(() => ratio(colors.fg, colors.bg))
const mutedContrast = computed(() => ratio(colors.muted, colors.bg))

// Surface the text colors' contrast against the background inline, so a seller picking
// an unreadable palette gets warned where they pick it (AA needs 4.5:1 for body text).
type ContrastRating = { label: string; color: 'success' | 'warning' | 'error' }
function contrastRating(r: number): ContrastRating {
  if (r >= 7) return { label: 'AAA', color: 'success' }
  if (r >= 4.5) return { label: 'AA', color: 'success' }
  if (r >= 3) return { label: 'Low', color: 'warning' }
  return { label: 'Fails', color: 'error' }
}
const colorContrast = computed<Partial<Record<ColorKey, ContrastRating>>>(() => ({
  fg: contrastRating(fgContrast.value),
  muted: contrastRating(mutedContrast.value),
}))

// Mirrors server bestOn(): the readable on-color the storefront actually paints on a
// filled brand surface, so the preview matches the live store.
function bestOn(bg: string): string {
  return ratio('#ffffff', bg) >= ratio('#111111', bg) ? '#ffffff' : '#111111'
}
const onPrimary = computed(() => bestOn(colors.primary))

// --- live preview: mirror the storefront's exact token→CSS mapping ---
const fontStack = (name: string) => `'${name}', ui-sans-serif, system-ui, sans-serif`
const headingFont = computed(() => fontStack(heading.value))
const bodyFont = computed(() => fontStack(body.value))
const radiusVal = computed(() => RADIUS_MAP[radius.value as DesignTokens['radius']])
const shadowVal = computed(() => SHADOW_MAP[shadow.value as DesignTokens['shadow']])
const pad = computed(() => DENSITY_MAP[density.value as DesignTokens['density']].card)
const imageTint = computed(() => `color-mix(in oklab, ${colors.muted} 22%, ${colors.bg})`)
// The storefront tints its split/offset/centered hero band with a wash of the primary.
const heroTint = computed(() => `color-mix(in oklab, ${colors.primary} 7%, ${colors.bg})`)

// The art-direction model's one-line justification (display-only), and the preview
// product-card aspect mirroring the chosen productCard variant.
const rationale = computed(() => data.value?.rationale ?? null)
const PREVIEW_ASPECT: Record<string, string> = { portrait: 'aspect-4/5', square: 'aspect-square', editorial: 'aspect-3/4', tile: 'aspect-square' }
const previewAspect = computed(() => PREVIEW_ASPECT[productCard.value] ?? 'aspect-4/3')
// square/tile are framed cards; editorial centres its meta — mirrors useStoreArtDirection.
const cardFramed = computed(() => productCard.value === 'square' || productCard.value === 'tile')
const cardCenter = computed(() => productCard.value === 'editorial')

// --- device preview (desktop ⇄ mobile) ---
// Tailwind's responsive prefixes key off the REAL viewport, not this width-constrained
// preview, so the toggle drives column count & hero stacking DIRECTLY — mirroring the
// storefront's lg breakpoint (2-up grid / stacked hero on mobile, 3-up grid / split
// hero on desktop).
const device = ref<'desktop' | 'mobile'>('desktop')
const gridCols = computed(() => (device.value === 'mobile' ? 'grid-cols-2' : 'grid-cols-3'))
// full-bleed needs an image to overlay; without one it degrades to a centred band.
const effectiveHero = computed(() => (heroStyle.value === 'full-bleed' && !heroImage.value ? 'centered' : heroStyle.value))
const heroCentered = computed(() => effectiveHero.value === 'centered')
const heroSplit = computed(
  () => device.value === 'desktop' && !!heroImage.value && (effectiveHero.value === 'split' || effectiveHero.value === 'offset'),
)

// Primary CTA styling, mirroring buttonStyle (solid / soft / outline / pill). The
// transparent 1px border keeps the height identical across styles (no jump on switch).
const ctaStyle = computed(() => {
  const borderRadius = buttonStyle.value === 'pill' ? '9999px' : radiusVal.value
  if (buttonStyle.value === 'soft')
    return { background: `color-mix(in oklab, ${colors.primary} 14%, ${colors.bg})`, color: colors.primary, border: '1px solid transparent', borderRadius }
  if (buttonStyle.value === 'outline')
    return { background: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius }
  return { background: colors.primary, color: onPrimary.value, border: '1px solid transparent', borderRadius }
})
// The grid's quick-add affordance (soft brand pill), mirroring the storefront grid.
const quickAddStyle = computed(() => ({
  background: `color-mix(in oklab, ${colors.primary} 14%, ${colors.bg})`,
  color: colors.primary,
  borderRadius: '9999px',
}))

// Load the chosen Google fonts into the admin so the preview shows the real faces
// (the admin doesn't otherwise load them). Re-runs as the seller switches fonts.
useHead({ link: computed(() => googleFontLinks(heading.value, body.value)) })

// Human-friendly labels for the enum tokens — USelect shows these while the bound
// value stays the validated enum. Font names (unmapped) fall through title-cased,
// which leaves already-proper names (e.g. "Playfair Display") untouched.
const LABELS: Record<string, string> = {
  none: 'None', sm: 'Slight', md: 'Medium', lg: 'Large', xl: 'Extra large', full: 'Full',
  compact: 'Compact', cozy: 'Cozy', comfortable: 'Comfortable',
  solid: 'Solid', soft: 'Soft', outline: 'Outline', pill: 'Pill',
  subtle: 'Subtle', pronounced: 'Pronounced',
  catalog: 'Catalog', lookbook: 'Lookbook', editorial: 'Editorial', boutique: 'Boutique',
  split: 'Split', 'full-bleed': 'Full-bleed image', centered: 'Centered', offset: 'Offset',
  portrait: 'Portrait', square: 'Square', tile: 'Compact tile',
  lift: 'Lift', zoom: 'Zoom',
}
const titleCase = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const opts = (a: readonly string[]) => a.map((v) => ({ label: LABELS[v] ?? titleCase(v), value: v }))

const generating = ref(false)
const saving = ref(false)
const uploading = ref(false)
const msg = ref<string | null>(null)
const err = ref<string | null>(null)

function fail(e: unknown, fallback: string) {
  err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || fallback
}

async function generate() {
  generating.value = true
  msg.value = null
  err.value = null
  try {
    const res = await $fetch(`/api/admin/stores/${props.storeId}/theme/generate`, { method: 'POST' })
    const fromPosts = res.postImageCount ? ` and ${res.postImageCount} of your posts` : ''
    msg.value = res.colorFromLogo
      ? `Theme derived from your ${res.logoSource === 'manual' ? 'logo' : 'Instagram profile picture'}${fromPosts} — palette, fonts, mood & layout.`
      : res.fallbackUsed
        ? 'No logo or Gemini key found — applied a safe default theme. Connect Instagram or upload a logo for a branded palette.'
        : 'Generated a theme from your shop name.'
    await refresh()
  } catch (e) {
    fail(e, 'Generation failed')
  } finally {
    generating.value = false
  }
}

// Returns whether the save succeeded so the wizard can hold off advancing when it
// fails — the error is surfaced inline either way.
async function save(): Promise<boolean> {
  saving.value = true
  msg.value = null
  err.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/theme`, {
      method: 'PUT',
      body: {
        palette: { ...colors },
        typography: { heading: heading.value, body: body.value },
        radius: radius.value,
        density: density.value,
        buttonStyle: buttonStyle.value,
        shadow: shadow.value,
        mood: mood.value,
        artDirection: {
          layout: layout.value,
          hero: heroStyle.value,
          productCard: productCard.value,
          cardHover: cardHover.value,
          sectionOrder,
        },
      },
    })
    if (!props.embedded) msg.value = 'Theme saved.'
    await refresh()
    return true
  } catch (e) {
    fail(e, 'Save failed')
    return false
  } finally {
    saving.value = false
  }
}

async function onLogo(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  msg.value = null
  err.value = null
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch(`/api/admin/stores/${props.storeId}/theme/logo`, { method: 'POST', body: fd })
    msg.value = 'Logo uploaded — palette re-derived from it.'
    await refresh()
  } catch (e) {
    fail(e, 'Logo upload failed')
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

// --- hero image: auto-pick (AI-scored) + manual override ---
const heroPicking = ref(false)
const heroErr = ref<string | null>(null)

async function autoPickHero() {
  heroPicking.value = true
  heroErr.value = null
  try {
    const res = await $fetch(`/api/admin/stores/${props.storeId}/branding/auto-hero`, {
      method: 'POST',
      body: { force: true },
    })
    await refreshBranding()
    if (res.status === 'no-candidates')
      heroErr.value = 'No images to choose from yet — import from Instagram or add product photos first.'
    else if (res.status === 'error')
      heroErr.value = 'Could not pick a hero image — please try again.'
  } catch (e) {
    heroErr.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not pick a hero image.'
  } finally {
    heroPicking.value = false
  }
}

async function setHero(id: string) {
  heroErr.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/branding/${id}/hero`, { method: 'POST', body: { hero: true } })
    await refreshBranding()
  } catch (e) {
    heroErr.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not set the hero image.'
  }
}

// The wizard saves the theme from its Next button when embedded.
defineExpose({ save })
</script>

<template>
  <div>
    <div v-if="pending && !data" class="py-16 grid place-items-center text-ink-subtle">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
    </div>
    <template v-else>
      <p class="text-xs text-ink-muted">
        Version {{ version ?? '—' }} · derived from your logo &amp; posts — edit anything below.
      </p>

      <UAlert v-if="msg" class="mt-4" color="success" variant="soft" icon="i-lucide-check" :description="msg" />
      <UAlert v-if="err" class="mt-4" color="error" variant="soft" icon="i-lucide-circle-alert" :description="err" />
      <!-- Why the AI chose this art direction (display-only; from the theme model). -->
      <UAlert v-if="rationale" class="mt-4" color="neutral" variant="soft" icon="i-lucide-sparkles" title="Why this design" :description="rationale" />

      <!-- Logo + generate (full width — the source action that re-derives everything). -->
      <div class="mt-4 rounded-xl border border-default bg-white p-5 sm:p-6">
        <div class="flex flex-wrap items-center gap-4">
          <div class="size-16 shrink-0 rounded-lg border border-default bg-black/5 overflow-hidden grid place-items-center">
            <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="size-full object-contain">
            <UIcon v-else name="i-lucide-image" class="size-6 text-ink-subtle" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-medium text-ink">Brand logo</p>
            <p class="text-xs text-ink-muted">
              {{ logoSource === 'manual' ? 'Custom upload' : logoSource === 'profile_picture' ? 'From Instagram' : 'No logo yet' }}
              — its dominant color seeds your palette.
            </p>
          </div>
          <UButton as="label" variant="soft" color="neutral" size="sm" icon="i-lucide-upload" :loading="uploading" label="Upload logo" class="cursor-pointer">
            <input type="file" accept="image/*" class="hidden" :disabled="uploading" @change="onLogo">
          </UButton>
          <UButton :loading="generating" :disabled="generating" icon="i-lucide-refresh-cw" color="primary" label="Regenerate theme" @click="generate" />
        </div>
      </div>

      <!-- HERO & LANDING IMAGE: the storefront's lead photo. Picked automatically
           (AI-scored from branding posts & product photos); the owner can re-pick or
           choose another. This is the "select the proper hero image" surface. -->
      <UCard class="mt-4">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <UIcon name="i-lucide-image" class="size-5" />
              </div>
              <div>
                <h3 class="font-semibold text-ink">Hero &amp; landing image</h3>
                <p class="mt-0.5 text-sm text-ink-muted">Your storefront's first impression — picked from your best photo.</p>
              </div>
            </div>
            <UButton :loading="heroPicking" icon="i-lucide-sparkles" color="primary" variant="soft" size="sm" label="Auto-pick hero" @click="autoPickHero" />
          </div>
        </template>

        <UAlert v-if="heroErr" color="error" variant="soft" icon="i-lucide-circle-alert" :description="heroErr" class="mb-4" />

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div class="aspect-video overflow-hidden rounded-lg border border-default bg-black/5 sm:w-56 sm:shrink-0">
            <img v-if="currentHero?.public_url" :src="currentHero.public_url" alt="Current hero image" class="size-full object-cover">
            <div v-else class="grid size-full place-items-center text-ink-subtle"><UIcon name="i-lucide-image-off" class="size-7" /></div>
          </div>
          <div class="min-w-0 flex-1">
            <template v-if="currentHero">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :label="currentHero.source === 'product' ? 'From a product photo' : 'From your posts'" color="neutral" variant="subtle" size="sm" />
                <UBadge v-if="typeof currentHero.hero_score === 'number'" :label="`AI match ${currentHero.hero_score}/100`" color="primary" variant="subtle" size="sm" />
              </div>
              <p v-if="currentHero.hero_reason" class="mt-2 text-sm text-ink-muted">
                <span class="font-medium text-ink">Why this image:</span> {{ currentHero.hero_reason }}
              </p>
              <p v-else class="mt-2 text-sm text-ink-muted">This image leads your storefront. Auto-pick again, or choose another below.</p>
            </template>
            <p v-else class="text-sm text-ink-muted">
              No hero image yet. Auto-pick one from your photos, or connect Instagram for lifestyle shots. Without a hero, your storefront falls back to a clean text-led header.
            </p>
          </div>
        </div>

        <!-- Override: pick a different imported post as the hero. -->
        <div v-if="heroCandidates.length" class="mt-5">
          <p class="text-xs font-medium uppercase tracking-wide text-ink-subtle">Or choose another</p>
          <ul class="mt-2 flex gap-2 overflow-x-auto pb-1">
            <li v-for="a in heroCandidates" :key="a.id" class="shrink-0">
              <button
                type="button"
                class="relative block size-20 overflow-hidden rounded-lg border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                :class="a.used_as === 'hero' ? 'border-primary' : 'border-transparent hover:border-default'"
                :aria-pressed="a.used_as === 'hero'"
                :aria-label="a.used_as === 'hero' ? 'Current hero image' : 'Use this image as hero'"
                @click="setHero(a.id)"
              >
                <img :src="a.public_url!" alt="" class="size-full object-cover">
                <span v-if="a.used_as === 'hero'" class="absolute inset-x-0 bottom-0 grid place-items-center bg-primary/90 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-inverted">Hero</span>
              </button>
            </li>
          </ul>
        </div>
      </UCard>

      <!-- SPLIT WORKSPACE: settings (left, scrolls with the page) + live preview (right,
           sticky). Collapses to a single stacked column below lg and whenever embedded
           (the onboarding wizard caps width at max-w-3xl). -->
      <div class="mt-4 grid items-start gap-6 lg:gap-8" :class="embedded ? '' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]'">
        <!-- LEFT: settings -->
        <div class="space-y-4 min-w-0">
          <div class="grid gap-4 sm:grid-cols-2" :class="embedded ? '' : 'lg:grid-cols-1'">
            <!-- Colors -->
            <UCard>
              <template #header><h3 class="font-semibold text-ink">Colors</h3></template>
              <div class="space-y-2.5">
                <div v-for="c in VISIBLE_COLORS" :key="c.key" class="flex items-center gap-3">
                  <input v-model="colors[c.key]" type="color" :aria-label="c.label" class="size-9 shrink-0 cursor-pointer rounded-lg border border-default bg-transparent p-0.5 transition hover:border-primary/60">
                  <span class="w-20 text-sm text-ink-muted">{{ c.label }}</span>
                  <UInput v-model="colors[c.key]" size="sm" class="flex-1 font-mono" />
                  <UBadge v-if="colorContrast[c.key]" :color="colorContrast[c.key]!.color" variant="soft" size="sm" class="shrink-0" :label="colorContrast[c.key]!.label" />
                </div>
              </div>
            </UCard>

            <!-- Typography & style -->
            <UCard>
              <template #header><h3 class="font-semibold text-ink">Typography &amp; style</h3></template>
              <div class="space-y-4">
                <UFormField label="Heading font"><USelect v-model="heading" :items="opts(ALLOWED_HEADING_FONTS)" class="w-full" /></UFormField>
                <UFormField label="Body font"><USelect v-model="body" :items="opts(ALLOWED_BODY_FONTS)" class="w-full" /></UFormField>
                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Corners"><USelect v-model="radius" :items="opts(ALLOWED_RADIUS)" class="w-full" /></UFormField>
                  <UFormField label="Density"><USelect v-model="density" :items="opts(ALLOWED_DENSITY)" class="w-full" /></UFormField>
                  <UFormField label="Buttons"><USelect v-model="buttonStyle" :items="opts(ALLOWED_BUTTON)" class="w-full" /></UFormField>
                  <UFormField label="Shadow"><USelect v-model="shadow" :items="opts(['none', 'subtle', 'pronounced'])" class="w-full" /></UFormField>
                </div>
                <UFormField label="Mood"><USelectMenu v-model="mood" :items="[...ALLOWED_MOOD]" multiple placeholder="Pick up to 4" class="w-full" /></UFormField>
              </div>
            </UCard>
          </div>

          <!-- Layout & structure: the art direction the AI picks from your post identity.
               These select WHICH layout primitives the live store renders (hero composition,
               product-card treatment, section rhythm). -->
          <UCard>
            <template #header>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-semibold text-ink">Layout &amp; structure</h3>
                <span class="text-xs text-ink-subtle">Chosen from your posts — override any of it</span>
              </div>
            </template>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4" :class="embedded ? '' : 'lg:grid-cols-2'">
              <UFormField label="Layout"><USelect v-model="layout" :items="opts(ALLOWED_LAYOUT)" class="w-full" /></UFormField>
              <UFormField label="Hero"><USelect v-model="heroStyle" :items="opts(ALLOWED_HERO)" class="w-full" /></UFormField>
              <UFormField label="Product cards"><USelect v-model="productCard" :items="opts(ALLOWED_PRODUCT_CARD)" class="w-full" /></UFormField>
              <UFormField label="Card hover"><USelect v-model="cardHover" :items="opts(ALLOWED_CARD_HOVER)" class="w-full" /></UFormField>
            </div>
          </UCard>
        </div>

        <!-- RIGHT: live preview — a faithful slice of the storefront (same fonts, colors,
             corners, shadow, button style, density & art direction the live store renders).
             Sticky on desktop so it stays in view while the settings column scrolls. -->
        <div :class="embedded ? '' : 'lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto'">
          <UCard>
            <template #header>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-semibold text-ink">Preview</h3>
                <UButtonGroup size="xs">
                  <UButton
                    icon="i-lucide-monitor"
                    :color="device === 'desktop' ? 'primary' : 'neutral'"
                    :variant="device === 'desktop' ? 'solid' : 'ghost'"
                    aria-label="Desktop preview"
                    @click="device = 'desktop'"
                  />
                  <UButton
                    icon="i-lucide-smartphone"
                    :color="device === 'mobile' ? 'primary' : 'neutral'"
                    :variant="device === 'mobile' ? 'solid' : 'ghost'"
                    aria-label="Mobile preview"
                    @click="device = 'mobile'"
                  />
                </UButtonGroup>
              </div>
            </template>

            <!-- Device frame: width flips with the toggle. The faux browser chrome mirrors
                 the onboarding storefront-preview frame. -->
            <div class="mx-auto transition-[max-width] duration-300 ease-out" :class="device === 'mobile' ? 'max-w-100' : 'max-w-none'">
              <div class="overflow-hidden rounded-xl border border-default shadow-sm">
                <div class="flex items-center gap-1.5 border-b border-default bg-black/5 px-3 py-2">
                  <span class="size-2.5 rounded-full bg-error/40" />
                  <span class="size-2.5 rounded-full bg-warning/40" />
                  <span class="size-2.5 rounded-full bg-success/40" />
                  <div class="mx-2 flex-1 truncate rounded-md bg-black/5 px-2.5 py-1 text-center text-[0.7rem] text-ink-subtle">{{ previewHost }}</div>
                  <UIcon :name="device === 'mobile' ? 'i-lucide-smartphone' : 'i-lucide-monitor'" class="size-3.5 shrink-0 text-ink-subtle" />
                </div>

                <!-- Storefront slice -->
                <div class="overflow-hidden" :style="{ background: colors.bg, color: colors.fg, fontFamily: bodyFont }">
                  <!-- HERO — full-bleed overlays copy on the image; split/offset/centered
                       render the brand band. Stacks on mobile, splits on desktop. -->
                  <div
                    v-if="effectiveHero === 'full-bleed'"
                    class="relative isolate flex flex-col justify-end overflow-hidden p-5"
                    :style="{ minHeight: device === 'mobile' ? '15rem' : '18rem' }"
                  >
                    <img :src="heroImage!" alt="" class="absolute inset-0 -z-10 size-full object-cover">
                    <div class="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/35 to-black/10" aria-hidden="true" />
                    <div class="max-w-md text-white">
                      <span class="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/80">
                        <span class="inline-block h-px w-5" :style="{ background: colors.accent }" />@{{ data?.subdomain || 'yourshop' }}
                      </span>
                      <p class="mt-3 text-2xl font-semibold leading-tight tracking-tight" :style="{ fontFamily: headingFont }">{{ data?.subdomain || 'Your store' }}</p>
                      <div class="mt-3 h-1.5 w-12 rounded-full" :style="{ background: colors.accent }" />
                      <p class="mt-3 max-w-sm text-sm leading-relaxed text-white/85">A short line about your shop, set in your body font.</p>
                      <div class="mt-4">
                        <button type="button" class="px-4 py-2 text-sm font-medium" :style="ctaStyle">Shop all</button>
                      </div>
                    </div>
                  </div>

                  <div v-else class="p-5" :style="{ background: heroTint }">
                    <div :class="heroSplit ? 'grid grid-cols-[1.05fr_0.95fr] items-center gap-6' : 'flex flex-col gap-4'">
                      <div :class="heroCentered ? 'mx-auto max-w-md text-center' : 'min-w-0'">
                        <div class="flex items-center gap-2" :class="heroCentered ? 'justify-center' : ''">
                          <span class="grid size-7 shrink-0 place-items-center overflow-hidden border" :style="{ borderRadius: radiusVal, borderColor: colors.border, background: imageTint }">
                            <img v-if="logoUrl" :src="logoUrl" alt="" class="size-full object-contain">
                            <UIcon v-else name="i-lucide-store" class="size-3.5" :style="{ color: colors.muted }" />
                          </span>
                          <span class="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em]" :style="{ color: colors.muted }">
                            <span class="inline-block h-px w-5" :style="{ background: colors.accent }" />@{{ data?.subdomain || 'yourshop' }}
                          </span>
                        </div>
                        <p
                          class="mt-3 font-semibold leading-tight tracking-tight"
                          :class="effectiveHero === 'offset' ? 'text-3xl' : 'text-2xl'"
                          :style="{ fontFamily: headingFont, color: colors.fg }"
                        >
                          {{ data?.subdomain || 'Your store' }}
                        </p>
                        <div class="mt-3 h-1.5 w-12 rounded-full" :class="heroCentered ? 'mx-auto' : ''" :style="{ background: colors.primary }" />
                        <p class="mt-3 max-w-sm text-sm leading-relaxed" :class="heroCentered ? 'mx-auto' : ''" :style="{ color: colors.muted }">
                          A short line about your shop, set in your body font.
                        </p>
                        <div class="mt-4 flex" :class="heroCentered ? 'justify-center' : ''">
                          <button type="button" class="px-4 py-2 text-sm font-medium transition-transform active:scale-95" :style="ctaStyle">Shop all</button>
                        </div>
                      </div>

                      <!-- Framed lifestyle shot with an offset brand-colour block (signature) -->
                      <div v-if="heroSplit" class="relative">
                        <div
                          class="absolute inset-0"
                          :class="effectiveHero === 'offset' ? 'translate-x-2 translate-y-2' : '-translate-x-2 translate-y-2'"
                          :style="{ background: colors.accent, opacity: 0.18, borderRadius: radiusVal }"
                        />
                        <div
                          class="relative overflow-hidden border"
                          :class="effectiveHero === 'offset' ? 'aspect-square' : 'aspect-4/5'"
                          :style="{ borderRadius: radiusVal, borderColor: colors.border, boxShadow: shadowVal }"
                        >
                          <img :src="heroImage!" alt="" class="size-full object-cover">
                        </div>
                      </div>
                    </div>

                    <!-- CENTERED with an image: a wide editorial band beneath the copy. -->
                    <div v-if="heroCentered && heroImage" class="mt-5 overflow-hidden border" :style="{ borderRadius: radiusVal, borderColor: colors.border, boxShadow: shadowVal }">
                      <img :src="heroImage" alt="" class="aspect-16/7 size-full object-cover">
                    </div>
                  </div>

                  <!-- PRODUCTS — the eyebrow motif + a grid of the seller's catalogue.
                       3-up on desktop, 2-up on mobile (mirrors the storefront's lg flip). -->
                  <div class="p-5">
                    <div>
                      <span class="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em]" :style="{ color: colors.muted }">
                        <span class="inline-block h-px w-6" :style="{ background: colors.accent }" />
                        The collection
                      </span>
                      <p class="mt-1.5 text-xl font-semibold tracking-tight" :style="{ fontFamily: headingFont, color: colors.fg }">Shop all</p>
                    </div>
                    <div class="mt-4 grid" :class="gridCols" :style="{ gap: pad }">
                      <article v-for="(p, i) in previewItems" :key="i" :class="cardCenter ? 'text-center' : ''">
                        <div class="relative">
                          <div
                            class="overflow-hidden"
                            :class="previewAspect"
                            :style="{ background: imageTint, borderRadius: radiusVal, border: cardFramed ? `1px solid ${colors.border}` : 'none' }"
                          >
                            <img v-if="p.image" :src="p.image" :alt="p.title" class="size-full object-cover">
                            <div v-else class="grid size-full place-items-center">
                              <UIcon name="i-lucide-image" class="size-5" :style="{ color: colors.muted }" />
                            </div>
                          </div>
                          <span class="absolute right-1.5 top-1.5 grid size-7 place-items-center text-sm font-semibold shadow-sm" :style="quickAddStyle" aria-hidden="true">+</span>
                        </div>
                        <p class="mt-2 line-clamp-1 text-sm font-medium" :style="{ fontFamily: headingFont, color: colors.fg }">{{ p.title }}</p>
                        <p class="mt-0.5 text-sm font-semibold" :style="{ color: colors.primary }">{{ p.price }}</p>
                      </article>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <div v-if="!embedded" class="mt-6 flex items-center gap-3">
        <UButton :loading="saving" :disabled="saving" icon="i-lucide-check" color="primary" label="Save theme" @click="save" />
      </div>
    </template>
  </div>
</template>
