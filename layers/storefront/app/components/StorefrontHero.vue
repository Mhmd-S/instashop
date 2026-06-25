<script setup lang="ts">
import type { ResolvedStore } from '~~/shared/types/tenant'

// The storefront hero. Renders one of four compositions chosen by the store's
// art direction (split / full-bleed / centered / offset) — the single biggest signal
// that two shops are genuinely different sites, not a recolour. Falls back gracefully
// to a copy-only layout when the shop has no hero image to anchor an image-led variant.
const props = defineProps<{
  store: ResolvedStore | null
  heroImage: { public_url: string | null; caption: string | null } | null
  heroLine: string
  hasCategories: boolean
}>()

const { logo } = useTenant()
const cta = useStoreCta()
const ad = useStoreArtDirection()

const imageUrl = computed(() => props.heroImage?.public_url ?? null)
const imageAlt = computed(() => props.heroImage?.caption ?? props.store?.name ?? 'Store')

// full-bleed needs an image to overlay; without one it degrades to a centred band.
const variant = computed(() => {
  const v = ad.value.hero.variant
  if (v === 'full-bleed' && !imageUrl.value) return 'centered'
  return v
})
// Recompute the composition classes for the EFFECTIVE variant so a degraded
// full-bleed→centered hero gets the centred rule, not the leftover full-bleed one.
const heroCfg = computed(() => heroVariantClasses(variant.value))
const centered = computed(() => variant.value === 'centered' || (heroCfg.value.align === 'center' && !imageUrl.value))

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <!-- FULL-BLEED: immersive image with the copy overlaid on a scrim (white text is
       always readable on the gradient, so this stays a11y-safe regardless of palette). -->
  <section v-if="variant === 'full-bleed'" class="relative isolate overflow-hidden border-b border-default">
    <img :src="imageUrl!" :alt="imageAlt" class="absolute inset-0 -z-10 size-full object-cover">
    <div class="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/35 to-black/15" aria-hidden="true" />
    <UContainer :class="['flex min-h-[78vh] flex-col justify-end', ad.hero.section]">
      <div class="max-w-2xl text-white">
        <div v-if="logo" class="mb-6"><StorefrontBrand variant="mark" size="lg" /></div>
        <p class="flex items-center gap-2.5 text-white/80" :class="ad.hero.eyebrow">
          <span class="h-px w-7 bg-accent" />@{{ props.store?.subdomain }}
        </p>
        <h1 class="mt-4 text-white" :class="heroCfg.heading">{{ props.store?.name ?? 'Store' }}</h1>
        <div class="mt-5" :class="heroCfg.rule" />
        <p class="mt-6 max-w-lg text-pretty text-lg text-white/85 leading-[var(--t-leading-body)]">{{ heroLine }}</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <UButton size="lg" color="primary" v-bind="cta" label="Shop all" trailing-icon="i-lucide-arrow-down" @click="scrollTo('products')" />
          <UButton v-if="hasCategories" size="lg" color="neutral" variant="solid" label="Browse categories" @click="scrollTo('categories')" />
        </div>
      </div>
    </UContainer>
  </section>

  <!-- SPLIT / OFFSET / CENTERED: copy + (optional) framed image. OFFSET bleeds the
       image block and supersizes the headline; CENTERED stacks copy and drops the
       image column. -->
  <section
    v-else
    class="relative overflow-hidden border-b border-default bg-[color-mix(in_oklab,var(--ui-primary)_7%,var(--ui-bg))]"
  >
    <UContainer
      class="grid items-center gap-10"
      :class="[ad.hero.section, imageUrl && !centered ? (variant === 'offset' ? 'lg:grid-cols-[1fr_1fr]' : 'lg:grid-cols-[1.1fr_0.9fr]') : '']"
    >
      <div :class="centered ? 'mx-auto max-w-2xl text-center' : ''">
        <div v-if="logo" class="mb-6 flex" :class="centered ? 'justify-center' : ''">
          <StorefrontBrand variant="mark" size="lg" />
        </div>
        <p class="flex items-center gap-2.5 text-muted" :class="[ad.hero.eyebrow, centered ? 'justify-center' : '']">
          <span class="h-px w-7 bg-accent" />@{{ props.store?.subdomain }}
        </p>

        <h1 class="mt-4 text-highlighted" :class="heroCfg.heading">{{ props.store?.name ?? 'Store' }}</h1>

        <div class="mt-5" :class="[heroCfg.rule, centered ? 'mx-auto' : '']" />

        <p
          class="mt-6 max-w-lg text-pretty text-lg text-muted leading-[var(--t-leading-body)]"
          :class="centered ? 'mx-auto' : ''"
        >
          {{ heroLine }}
        </p>

        <div class="mt-8 flex flex-wrap gap-3" :class="centered ? 'justify-center' : ''">
          <UButton size="lg" color="primary" v-bind="cta" label="Shop all" trailing-icon="i-lucide-arrow-down" @click="scrollTo('products')" />
          <UButton v-if="hasCategories" size="lg" color="neutral" variant="subtle" label="Browse categories" @click="scrollTo('categories')" />
        </div>
      </div>

      <!-- Framed lifestyle shot with an offset brand-colour block (signature) -->
      <div v-if="imageUrl && !centered" class="relative mx-auto w-full max-w-md lg:max-w-none">
        <div
          class="absolute h-full w-full rounded-[var(--ui-radius)] bg-accent"
          :class="[
            variant === 'offset' ? '-bottom-4 -right-4' : '-bottom-3 -left-3',
            ad.expressive ? 'opacity-25' : 'opacity-[0.15]',
          ]"
          aria-hidden="true"
        />
        <div class="relative overflow-hidden rounded-[var(--ui-radius)] border border-default shadow-[var(--t-shadow)]">
          <img :src="imageUrl" :alt="imageAlt" class="size-full object-cover" :class="variant === 'offset' ? 'aspect-square' : 'aspect-[4/5]'">
        </div>
      </div>
    </UContainer>

    <!-- CENTERED with an image: a wide editorial band beneath the copy. -->
    <UContainer v-if="imageUrl && centered" class="pb-(--t-space-section)">
      <div class="overflow-hidden rounded-[var(--ui-radius)] border border-default shadow-[var(--t-shadow)]">
        <img :src="imageUrl" :alt="imageAlt" class="aspect-[16/7] size-full object-cover">
      </div>
    </UContainer>
  </section>
</template>
