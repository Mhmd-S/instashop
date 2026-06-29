<script setup lang="ts">
import type { Component } from 'vue'
import type { ResolvedStore } from '~~/shared/types/tenant'
import type { SectionConfig, SectionId } from '~~/shared/types/template'
import { SECTION_COMPONENTS, shouldRenderSection, type SectionRenderCtx } from '../utils/sectionRegistry'

// The "Atelier" storefront home: ONE canonical template whose composition is data.
// It resolves the shop's content once, then dispatches the saved `sectionOrder` through
// the section registry. The very same section components drive the in-admin live preview
// (Phase 5), so preview == store by construction.
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

const ctx = computed<SectionRenderCtx>(() => ({
  store: props.store,
  products: products.value,
  categories: categories.value,
  hero: hero.value,
  heroLine: heroLine.value,
  // Same gate shouldRenderSection uses for shopByCategory, so the hero CTA appears
  // exactly when the #categories anchor will be on the page.
  hasCategorySection:
    ad.value.sectionOrder.includes('shopByCategory') &&
    ad.value.sections.shopByCategory?.enabled !== false &&
    categories.value.length > 0,
}))

// Resolve the ordered composition to concrete (component, config) pairs, dropping any
// section that isn't registered yet or whose data is too thin to look finished.
const sections = computed(() =>
  ad.value.sectionOrder
    .map((id) => ({ id, component: SECTION_COMPONENTS[id], config: ad.value.sections[id] }))
    .filter((s): s is { id: SectionId; component: Component; config: SectionConfig } =>
      !!s.component && !!s.config && shouldRenderSection(s.id, s.config, ctx.value),
    ),
)
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <StorefrontHeader />

    <component :is="s.component" v-for="s in sections" :key="s.id" :config="s.config" :ctx="ctx" />

    <footer class="border-t border-(--t-rule)">
      <UContainer class="flex flex-col gap-6 py-14 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <StorefrontBrand />
          <p class="mt-2 text-[0.7rem] uppercase tracking-[0.18em] text-muted">@{{ props.store?.subdomain }}</p>
        </div>
        <p class="text-[0.68rem] uppercase tracking-[0.18em] text-muted/70">Powered by Chanis</p>
      </UContainer>
    </footer>
  </div>
</template>
