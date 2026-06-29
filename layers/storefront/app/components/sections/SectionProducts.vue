<script setup lang="ts">
import type { ProductsSection } from '~~/shared/types/template'
import { resolveCopy } from '~~/shared/template/copy'
import type { SectionRenderCtx } from '../../utils/sectionRegistry'

// The full buyable gallery — always present. The header sits on a hairline; the grid
// (StorefrontProductGrid) is bare, image-forward, generously spaced.
const props = defineProps<{ config: ProductsSection; ctx: SectionRenderCtx }>()
const products = computed(() => props.ctx.products)
const copy = computed(() => resolveCopy(props.config.copySlot, props.ctx.store?.name))
</script>

<template>
  <UContainer id="products" class="scroll-mt-24 py-20 sm:py-28 lg:py-32">
    <Reveal>
      <div class="flex items-baseline justify-between gap-4 border-b border-(--t-rule) pb-5">
        <div>
          <StorefrontEyebrow>{{ copy.eyebrow }}</StorefrontEyebrow>
          <h2 class="mt-2.5 font-heading text-2xl font-normal tracking-[-0.01em] text-highlighted sm:text-[2rem]">
            {{ copy.heading }}
          </h2>
        </div>
        <span v-if="products.length" class="shrink-0 text-[0.7rem] uppercase tracking-[0.18em] text-muted">
          {{ products.length }} {{ products.length === 1 ? 'piece' : 'pieces' }}
        </span>
      </div>
      <div class="mt-10 sm:mt-12">
        <StorefrontProductGrid :products="products" />
      </div>
    </Reveal>
  </UContainer>
</template>
