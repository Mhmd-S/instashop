<script setup lang="ts">
import type { PromiseSection } from '~~/shared/types/template'
import { resolveBadge } from '~~/shared/template/badges'
import type { SectionRenderCtx } from '../../utils/sectionRegistry'

// A static trust block near the footer — monochrome icon + small-caps label in
// hairline-divided columns. No colour, no fills; restraint is the point.
const props = defineProps<{ config: PromiseSection; ctx: SectionRenderCtx }>()
const items = computed(() => props.config.badges.map(resolveBadge))
const colClass = computed(() => (items.value.length >= 4 ? 'sm:grid-cols-4' : items.value.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'))
</script>

<template>
  <section class="border-t border-(--t-rule) py-16 sm:py-20">
    <UContainer>
      <Reveal>
        <ul class="grid grid-cols-2 gap-y-10 sm:divide-x sm:divide-(--t-rule)" :class="colClass">
          <li v-for="(b, i) in items" :key="b.label + i" class="flex flex-col items-center gap-3 px-4 text-center">
            <UIcon :name="b.icon" class="size-5 text-highlighted" />
            <span class="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted">{{ b.label }}</span>
          </li>
        </ul>
      </Reveal>
    </UContainer>
  </section>
</template>
