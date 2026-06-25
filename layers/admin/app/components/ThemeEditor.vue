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
// `embedded` is set when rendered inline in the onboarding wizard: it drops the
// editor's own Save button (the wizard's Next button drives the save via the
// exposed save() below) and stays quiet on success since we advance away.
const props = defineProps<{ storeId: string; embedded?: boolean }>()

const { data, refresh, pending } = useFetch(`/api/admin/stores/${props.storeId}/theme`, {
  lazy: true,
  getCachedData: () => undefined,
})
const version = computed(() => data.value?.version ?? null)
const logoUrl = computed(() => data.value?.logoUrl ?? null)
const logoSource = computed(() => data.value?.logo?.source ?? null)
const { storeUrl } = useSurfaceUrls()

// The seller's own products (set in the previous onboarding step) drive the preview,
// so it shows their real catalogue. Prefer one with an image; fall back to dummy
// content for a brand-new store. Non-blocking, like the theme fetch.
const { data: productData } = useFetch(`/api/admin/stores/${props.storeId}/products`, {
  lazy: true,
  getCachedData: () => undefined,
})
const previewProduct = computed<AdminProduct | null>(() => {
  const list = productData.value?.products ?? []
  return list.find((p) => p.image_url) ?? list[0] ?? null
})
const previewTitle = computed(() => previewProduct.value?.title || 'Sample product')
const previewDesc = computed(() => previewProduct.value?.description || 'A short description in your body font.')
const previewImage = computed(() => previewProduct.value?.image_url ?? null)
const previewPrice = computed(() => {
  const p = previewProduct.value
  if (p) return formatPrice(p.price_minor, p.currency)
  return formatPrice(4800, productData.value?.products?.[0]?.currency ?? 'USD')
})

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
// Section composition isn't edited inline (v1); preserved verbatim on save.
let sectionOrder: DesignTokens['artDirection']['sectionOrder'] = ['hero', 'categories', 'products']

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

// Mirrors server bestOn(): the readable on-color the storefront actually paints on a
// filled brand surface, so the preview matches the live store.
function bestOn(bg: string): string {
  return ratio('#ffffff', bg) >= ratio('#111111', bg) ? '#ffffff' : '#111111'
}
const onPrimary = computed(() => bestOn(colors.primary))
const onAccent = computed(() => bestOn(colors.accent))

// --- live preview: mirror the storefront's exact token→CSS mapping ---
const fontStack = (name: string) => `'${name}', ui-sans-serif, system-ui, sans-serif`
const headingFont = computed(() => fontStack(heading.value))
const bodyFont = computed(() => fontStack(body.value))
const radiusVal = computed(() => RADIUS_MAP[radius.value as DesignTokens['radius']])
const shadowVal = computed(() => SHADOW_MAP[shadow.value as DesignTokens['shadow']])
const pad = computed(() => DENSITY_MAP[density.value as DesignTokens['density']].card)
const imageTint = computed(() => `color-mix(in oklab, ${colors.muted} 22%, ${colors.bg})`)

// The art-direction model's one-line justification (display-only), and the preview
// product-card aspect mirroring the chosen productCard variant.
const rationale = computed(() => data.value?.rationale ?? null)
const PREVIEW_ASPECT: Record<string, string> = { portrait: 'aspect-4/5', square: 'aspect-square', editorial: 'aspect-3/4', tile: 'aspect-square' }
const previewAspect = computed(() => PREVIEW_ASPECT[productCard.value] ?? 'aspect-4/3')

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

// Load the chosen Google fonts into the admin so the preview shows the real faces
// (the admin doesn't otherwise load them). Re-runs as the seller switches fonts.
useHead({ link: computed(() => googleFontLinks(heading.value, body.value)) })

const opts = (a: readonly string[]) => a.map((v) => ({ label: v, value: v }))

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

// The wizard saves the theme from its Next button when embedded.
defineExpose({ save })
</script>

<template>
  <div>
    <div v-if="pending && !data" class="py-16 grid place-items-center text-dimmed">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
    </div>
    <template v-else>
    <div class="flex items-center justify-between gap-4">
      <p class="text-xs text-muted">
        Version {{ version ?? '—' }} · derived from your logo &amp; posts — edit anything below.
      </p>
    </div>

    <UAlert v-if="msg" class="mt-4" color="success" variant="soft" icon="i-lucide-check" :description="msg" />
    <UAlert v-if="err" class="mt-4" color="error" variant="soft" icon="i-lucide-circle-alert" :description="err" />
    <!-- Why the AI chose this art direction (display-only; from the theme model). -->
    <UAlert v-if="rationale" class="mt-4" color="neutral" variant="soft" icon="i-lucide-sparkles" title="Why this design" :description="rationale" />

    <!-- Logo + generate -->
    <UCard class="mt-4">
      <div class="flex items-center gap-4">
        <div class="size-16 shrink-0 rounded-lg border border-default bg-muted overflow-hidden grid place-items-center">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="size-full object-contain">
          <UIcon v-else name="i-lucide-image" class="size-6 text-dimmed" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-medium text-highlighted">Brand logo</p>
          <p class="text-xs text-muted">
            {{ logoSource === 'manual' ? 'Custom upload' : logoSource === 'profile_picture' ? 'From Instagram' : 'No logo yet' }}
            — its dominant color seeds your palette.
          </p>
        </div>
        <UButton as="label" variant="soft" color="neutral" size="sm" icon="i-lucide-upload" :loading="uploading" label="Upload logo" class="cursor-pointer">
          <input type="file" accept="image/*" class="hidden" :disabled="uploading" @change="onLogo">
        </UButton>
        <UButton :loading="generating" :disabled="generating" icon="i-lucide-refresh-cw" color="primary" label="Regenerate theme" @click="generate" />
      </div>
    </UCard>

    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <!-- Colors -->
      <UCard>
        <template #header><h3 class="font-semibold text-highlighted">Colors</h3></template>
        <div class="space-y-2.5">
          <div v-for="c in VISIBLE_COLORS" :key="c.key" class="flex items-center gap-3">
            <input v-model="colors[c.key]" type="color" class="size-8 shrink-0 cursor-pointer rounded border border-default bg-transparent">
            <span class="w-24 text-sm text-muted">{{ c.label }}</span>
            <UInput v-model="colors[c.key]" size="sm" class="flex-1 font-mono" />
          </div>
        </div>
      </UCard>

      <!-- Typography & style -->
      <UCard>
        <template #header><h3 class="font-semibold text-highlighted">Typography &amp; style</h3></template>
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
    <UCard class="mt-4">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-semibold text-highlighted">Layout &amp; structure</h3>
          <span class="text-xs text-dimmed">Chosen from your posts — override any of it</span>
        </div>
      </template>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <UFormField label="Layout"><USelect v-model="layout" :items="opts(ALLOWED_LAYOUT)" class="w-full" /></UFormField>
        <UFormField label="Hero"><USelect v-model="heroStyle" :items="opts(ALLOWED_HERO)" class="w-full" /></UFormField>
        <UFormField label="Product cards"><USelect v-model="productCard" :items="opts(ALLOWED_PRODUCT_CARD)" class="w-full" /></UFormField>
        <UFormField label="Card hover"><USelect v-model="cardHover" :items="opts(ALLOWED_CARD_HOVER)" class="w-full" /></UFormField>
      </div>
      <p class="mt-3 text-xs text-dimmed">
        Hero composition &amp; section rhythm preview live on your storefront. The card below reflects your product-card choice.
      </p>
    </UCard>

    <!-- Preview: a faithful slice of the storefront — the same fonts, colors, corners,
         shadow, button style & density the live store renders. -->
    <UCard class="mt-4">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-semibold text-highlighted">Preview</h3>
          <span class="text-xs text-dimmed">Live — fonts, colors, corners, shadow, buttons &amp; density</span>
        </div>
      </template>

      <div
        class="overflow-hidden border border-default"
        :style="{ background: colors.bg, color: colors.fg, fontFamily: bodyFont, borderRadius: radiusVal, boxShadow: shadowVal }"
      >
        <div class="flex flex-col p-5" :style="{ gap: pad }">
          <!-- Brand row -->
          <div class="flex items-center gap-3">
            <div
              class="size-9 shrink-0 grid place-items-center overflow-hidden border"
              :style="{ borderRadius: radiusVal, borderColor: colors.border, background: imageTint }"
            >
              <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="size-full object-contain">
              <UIcon v-else name="i-lucide-store" class="size-4" :style="{ color: colors.muted }" />
            </div>
            <span class="text-lg font-semibold leading-tight" :style="{ fontFamily: headingFont }">
              {{ data?.subdomain || 'Your store' }}
            </span>
          </div>

          <!-- Eyebrow + section heading (the storefront's signature motif) -->
          <div>
            <span class="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em]" :style="{ color: colors.muted }">
              <span class="inline-block h-px w-6" :style="{ background: colors.accent }" />
              The collection
            </span>
            <p class="mt-1.5 text-xl font-semibold tracking-tight" :style="{ fontFamily: headingFont }">Shop all</p>
          </div>

          <!-- Product card -->
          <div
            class="border"
            :style="{ background: colors.card, borderColor: colors.border, borderRadius: radiusVal, boxShadow: shadowVal, padding: pad }"
          >
            <div class="relative">
              <div class="w-full overflow-hidden" :class="previewAspect" :style="{ background: imageTint, borderRadius: radiusVal }">
                <img v-if="previewImage" :src="previewImage" :alt="previewTitle" class="size-full object-cover">
                <div v-else class="grid size-full place-items-center">
                  <UIcon name="i-lucide-image" class="size-6" :style="{ color: colors.muted }" />
                </div>
              </div>
              <span
                class="absolute left-2 top-2 px-2 py-0.5 text-[0.65rem] font-semibold"
                :style="{ background: colors.accent, color: onAccent, borderRadius: '9999px' }"
              >New</span>
            </div>
            <p class="mt-3 font-medium" :style="{ fontFamily: headingFont }">{{ previewTitle }}</p>
            <p class="mt-1 text-sm leading-relaxed line-clamp-2" :style="{ color: colors.muted }">{{ previewDesc }}</p>
            <div class="mt-3 flex items-center justify-between gap-3">
              <span class="text-base font-semibold" :style="{ color: colors.primary }">{{ previewPrice }}</span>
              <button type="button" class="px-3.5 py-1.5 text-sm font-medium transition-transform active:scale-95" :style="ctaStyle">
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <div v-if="!embedded" class="mt-4 flex items-center gap-3">
      <UButton :loading="saving" :disabled="saving" icon="i-lucide-check" color="primary" label="Save theme" @click="save" />
    </div>
    </template>
  </div>
</template>
