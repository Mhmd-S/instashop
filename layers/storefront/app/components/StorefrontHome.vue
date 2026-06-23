<script setup lang="ts">
import type { ResolvedStore } from '~~/shared/types/tenant'

const props = defineProps<{ store: ResolvedStore | null }>()

const { logo } = useTenant()

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

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <StorefrontHeader />

    <!-- Hero: brand-forward and editorial. The store's own colour + heading face carry
         it; the brand-coloured rule is the signature motif repeated across sections. -->
    <section
      class="relative overflow-hidden border-b border-default bg-[color-mix(in_oklab,var(--ui-primary)_7%,var(--ui-bg))]"
    >
      <UContainer
        class="grid items-center gap-10 py-14 sm:py-20"
        :class="hero?.public_url ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''"
      >
        <div :class="hero?.public_url ? '' : 'mx-auto max-w-2xl text-center'">
          <div v-if="logo" class="mb-6 flex" :class="hero?.public_url ? '' : 'justify-center'">
            <StorefrontBrand variant="mark" size="lg" />
          </div>
          <p class="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted"
             :class="hero?.public_url ? '' : 'justify-center'">
            <span class="h-px w-7 bg-primary" />@{{ props.store?.subdomain }}
          </p>

          <h1 class="mt-4 font-heading text-5xl font-semibold leading-[0.95] tracking-tight text-balance text-highlighted sm:text-7xl">
            {{ props.store?.name ?? 'Store' }}
          </h1>

          <div class="mt-5 h-1.5 w-16 rounded-full bg-primary" :class="hero?.public_url ? '' : 'mx-auto'" />

          <p class="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-muted"
             :class="hero?.public_url ? '' : 'mx-auto'">
            {{ heroLine }}
          </p>

          <div class="mt-8 flex flex-wrap gap-3" :class="hero?.public_url ? '' : 'justify-center'">
            <UButton size="lg" color="primary" label="Shop all" trailing-icon="i-lucide-arrow-down" @click="scrollTo('products')" />
            <UButton
              v-if="categories.length"
              size="lg" color="neutral" variant="subtle" label="Browse categories"
              @click="scrollTo('categories')"
            />
          </div>
        </div>

        <!-- Framed lifestyle shot with an offset brand-colour block (signature) -->
        <div v-if="hero?.public_url" class="relative mx-auto w-full max-w-md lg:max-w-none">
          <div class="absolute -bottom-3 -left-3 h-full w-full rounded-[var(--ui-radius)] bg-primary/15" aria-hidden="true" />
          <div class="relative overflow-hidden rounded-[var(--ui-radius)] border border-default shadow-[var(--t-shadow)]">
            <img :src="hero.public_url" :alt="hero.caption ?? props.store?.name ?? 'Store'" class="aspect-[4/5] size-full object-cover">
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Shop by category: the store's real taxonomy as browsable tiles -->
    <section v-if="categories.length" id="categories" class="scroll-mt-20 border-b border-default py-12 sm:py-16">
      <UContainer>
        <p class="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          <span class="h-px w-7 bg-primary" />Shop by category
        </p>
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

    <!-- Products -->
    <UContainer id="products" class="scroll-mt-20 py-12 sm:py-16">
      <div class="mb-7 flex items-end justify-between gap-4">
        <div>
          <p class="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            <span class="h-px w-7 bg-primary" />The collection
          </p>
          <h2 class="mt-2 font-heading text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">Shop all</h2>
        </div>
        <span v-if="products.length" class="shrink-0 pb-1 text-sm text-muted">
          {{ products.length }} {{ products.length === 1 ? 'item' : 'items' }}
        </span>
      </div>
      <StorefrontProductGrid :products="products" />
    </UContainer>

    <footer class="border-t border-default bg-[color-mix(in_oklab,var(--ui-primary)_5%,var(--ui-bg))]">
      <UContainer class="flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <StorefrontBrand />
          <p class="mt-1.5 text-sm text-muted">@{{ props.store?.subdomain }}</p>
        </div>
        <p class="text-xs text-muted">Powered by Insteshop</p>
      </UContainer>
    </footer>
  </div>
</template>
