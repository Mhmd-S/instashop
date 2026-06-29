<script setup lang="ts">
import type { FeaturedRailSection } from '~~/shared/types/template'
import { formatPrice } from '~~/shared/types/product'
import { resolveCopy } from '~~/shared/template/copy'
import { resolveRailProducts, type SectionRenderCtx } from '../../utils/sectionRegistry'

// A "selected" rail — a few pieces given more room than the grid. Editorial: large
// frameless photographs, a hairline-filed header, quiet captions. Curated picks
// (productRefs) topped up with first-N so it always reads complete.
const props = defineProps<{ config: FeaturedRailSection; ctx: SectionRenderCtx }>()
const ad = useStoreArtDirection()

const products = computed(() => resolveRailProducts(props.config, props.ctx))
const copy = computed(() => resolveCopy(props.config.copySlot, props.ctx.store?.name))

const cardWidth = computed(() => {
  switch (props.config.size) {
    case 'sm':
      return 'w-[15rem] sm:w-[16rem]'
    case 'lg':
      return 'w-[20rem] sm:w-[24rem]'
    default:
      return 'w-[17rem] sm:w-[20rem]'
  }
})
</script>

<template>
  <section class="py-20 sm:py-28 lg:py-32">
    <UContainer>
      <Reveal>
        <div class="flex items-baseline justify-between gap-4 border-b border-(--t-rule) pb-5">
          <div>
            <StorefrontEyebrow>{{ copy.eyebrow }}</StorefrontEyebrow>
            <h2 class="mt-2.5 font-heading text-2xl font-normal tracking-[-0.01em] text-highlighted sm:text-[2rem]">
              {{ copy.heading }}
            </h2>
          </div>
        </div>
      </Reveal>
    </UContainer>

    <!-- Snap rail; bleeds to the right edge for a quiet "more to see" cue. -->
    <div class="mt-10 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-12 [&::-webkit-scrollbar]:hidden">
      <UContainer>
        <ul class="flex snap-x snap-mandatory gap-6 sm:gap-8">
          <li v-for="p in products" :key="p.id" class="group shrink-0 snap-start" :class="cardWidth">
            <ULink :to="`/products/${p.slug}`" class="block focus:outline-none focus-visible:ring-1 focus-visible:ring-(--ui-text)">
              <div class="overflow-hidden bg-(--t-paper-2)">
                <img
                  v-if="p.image_url"
                  :src="p.image_url"
                  :alt="p.title"
                  loading="lazy"
                  class="aspect-[4/5] size-full object-cover transition duration-700 ease-soft"
                  :class="ad.card.hover === 'zoom' ? 'motion-safe:group-hover:scale-[1.03]' : ''"
                >
                <div v-else class="grid aspect-[4/5] size-full place-items-center text-muted/50"><UIcon name="i-lucide-image" class="size-6" /></div>
              </div>
              <h3 class="mt-3.5 truncate text-sm font-normal text-highlighted">{{ p.title }}</h3>
              <p class="mt-1 text-sm text-muted">{{ formatPrice(p.price_minor, p.currency) }}</p>
            </ULink>
          </li>
        </ul>
      </UContainer>
    </div>
  </section>
</template>
