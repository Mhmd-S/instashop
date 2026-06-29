<script setup lang="ts">
import type { ShopByCategorySection } from '~~/shared/types/template'
import { resolveCopy } from '~~/shared/template/copy'
import type { SectionRenderCtx } from '../../utils/sectionRegistry'

// The shop's taxonomy as a quiet typographic index — large category names filed on
// hairlines, an arrow that steps right on hover. Reads like a contents page, not a
// grid of buttons. (Image-backed category covers arrive in Phase 2.)
const props = defineProps<{ config: ShopByCategorySection; ctx: SectionRenderCtx }>()
const categories = computed(() => props.ctx.categories)
const copy = computed(() => resolveCopy('browse', props.ctx.store?.name))
</script>

<template>
  <section id="categories" class="scroll-mt-24 py-20 sm:py-28 lg:py-32">
    <UContainer>
      <Reveal>
        <div class="border-b border-(--t-rule) pb-5">
          <StorefrontEyebrow>{{ copy.eyebrow }}</StorefrontEyebrow>
          <h2 class="mt-2.5 font-heading text-2xl font-normal tracking-[-0.01em] text-highlighted sm:text-[2rem]">
            {{ copy.heading }}
          </h2>
        </div>
        <ul>
          <li v-for="c in categories" :key="c.slug">
            <ULink
              :to="`/categories/${c.slug}`"
              class="group flex items-center justify-between gap-6 border-b border-(--t-rule) py-6 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-(--ui-text) sm:py-7"
            >
              <span class="font-heading text-xl font-normal tracking-[-0.01em] text-highlighted transition-opacity group-hover:opacity-60 sm:text-2xl">
                {{ c.name }}
              </span>
              <UIcon
                name="i-lucide-arrow-right"
                class="size-5 shrink-0 text-muted transition-transform duration-300 ease-soft motion-safe:group-hover:translate-x-1"
              />
            </ULink>
          </li>
        </ul>
      </Reveal>
    </UContainer>
  </section>
</template>
