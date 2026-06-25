<script setup lang="ts">
import type { ResolvedStore } from '~~/shared/types/tenant'
import { formatPrice } from '~~/shared/types/product'

const props = defineProps<{ store: ResolvedStore | null }>()

const ad = useStoreArtDirection()

const { data } = await useFetch('/api/storefront/products')
const products = computed(() => data.value?.products ?? [])

const { data: catData } = await useFetch('/api/storefront/categories')
const categories = computed(() => catData.value?.categories ?? [])

const { data: heroData } = await useFetch('/api/storefront/hero')
const hero = computed(() => heroData.value?.hero ?? null)

// Hero sub-line from REAL content (the shop's own taxonomy), never a fake tagline.
const heroLine = computed(() => {
  const names = categories.value.map((c) => c.name)
  if (names.length > 3) return `${names.slice(0, 3).join(', ')} & more`
  if (names.length) return names.join(', ')
  const n = products.value.length
  return n ? `${n} ${n === 1 ? 'item' : 'items'}` : 'New shop — products coming soon'
})

// A "Featured" spotlight only renders when the art direction asks for it AND there are
// enough products to make a teaser meaningful (no fake content).
const featured = computed(() =>
  ad.value.sections.includes('featured') && products.value.length >= 4 ? products.value.slice(0, 3) : [],
)
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <StorefrontHeader />

    <!-- Sections render in the order the store's art direction specifies (validated to
         always start with 'hero'). The hero composition itself flexes per store. -->
    <template v-for="sec in ad.sections" :key="sec">
      <StorefrontHero
        v-if="sec === 'hero'"
        :store="props.store"
        :hero-image="hero"
        :hero-line="heroLine"
        :has-categories="!!categories.length"
      />

      <!-- Shop by category: the store's real taxonomy as browsable tiles -->
      <section
        v-else-if="sec === 'categories' && categories.length"
        id="categories"
        class="scroll-mt-20 border-b border-default py-(--t-space-section) sm:py-(--t-space-section-lg)"
      >
        <UContainer>
          <StorefrontEyebrow>Shop by category</StorefrontEyebrow>
          <ul class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <li v-for="c in categories" :key="c.slug">
              <ULink
                :to="`/categories/${c.slug}`"
                class="group flex items-center justify-between gap-3 rounded-[var(--ui-radius)] border border-default bg-elevated/40 px-4 py-5 transition duration-200 hover:border-primary/60 hover:bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-safe:hover:-translate-y-0.5"
              >
                <span class="font-heading text-base font-medium leading-snug text-highlighted">{{ c.name }}</span>
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-4 shrink-0 text-muted transition group-hover:text-primary motion-safe:group-hover:translate-x-0.5"
                />
              </ULink>
            </li>
          </ul>
        </UContainer>
      </section>

      <!-- Featured spotlight: a larger, image-forward teaser of the first few items.
           Surface is a light tint of the actual bg (same pattern as hero/footer) so
           body text stays >=4.5:1 regardless of the neutral ramp — which isn't
           contrast-anchored on logo-less / hand-edited themes. The teaser intentionally
           re-surfaces the first items that also appear in the full grid below. -->
      <section
        v-else-if="sec === 'featured' && featured.length"
        class="scroll-mt-20 border-b border-default bg-[color-mix(in_oklab,var(--ui-primary)_5%,var(--ui-bg))] py-(--t-space-section) sm:py-(--t-space-section-lg)"
      >
        <UContainer>
          <StorefrontEyebrow>Featured</StorefrontEyebrow>
          <ul class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <li v-for="p in featured" :key="p.id" class="group">
              <ULink
                :to="`/products/${p.slug}`"
                class="block rounded-[var(--ui-radius)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div class="relative aspect-[4/5] overflow-hidden rounded-[var(--ui-radius)] border border-default bg-muted shadow-[var(--t-shadow)]">
                  <img
                    v-if="p.image_url"
                    :src="p.image_url"
                    :alt="p.title"
                    loading="lazy"
                    class="size-full object-cover transition duration-500 motion-safe:group-hover:scale-[1.04]"
                  >
                  <div v-else class="grid size-full place-items-center text-dimmed"><UIcon name="i-lucide-image-off" class="size-7" /></div>
                  <span
                    class="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--t-on-accent)]"
                  >Featured</span>
                </div>
                <h3 class="mt-3 font-heading text-lg font-medium leading-snug text-highlighted">{{ p.title }}</h3>
                <p class="mt-1 text-sm sm:text-base" :class="ad.card.price">{{ formatPrice(p.price_minor, p.currency) }}</p>
              </ULink>
            </li>
          </ul>
        </UContainer>
      </section>

      <!-- Products: the full grid. -->
      <UContainer
        v-else-if="sec === 'products'"
        id="products"
        class="scroll-mt-20 py-(--t-space-section) sm:py-(--t-space-section-lg)"
      >
        <div class="mb-7 flex items-end justify-between gap-4">
          <div>
            <StorefrontEyebrow>The collection</StorefrontEyebrow>
            <h2 class="mt-2 font-heading text-2xl font-semibold tracking-[var(--t-heading-tracking)] text-highlighted sm:text-3xl">Shop all</h2>
          </div>
          <span v-if="products.length" class="shrink-0 pb-1 text-sm text-muted">
            {{ products.length }} {{ products.length === 1 ? 'item' : 'items' }}
          </span>
        </div>
        <StorefrontProductGrid :products="products" />
      </UContainer>
    </template>

    <footer class="border-t border-default bg-[color-mix(in_oklab,var(--ui-primary)_5%,var(--ui-bg))]">
      <UContainer class="flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <StorefrontBrand />
          <p class="mt-1.5 text-sm text-muted">@{{ props.store?.subdomain }}</p>
        </div>
        <p class="text-xs text-muted">Powered by Chanis</p>
      </UContainer>
    </footer>
  </div>
</template>
