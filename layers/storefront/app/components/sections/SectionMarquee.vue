<script setup lang="ts">
import type { MarqueeSection } from '~~/shared/types/template'
import { resolveBadge } from '~~/shared/template/badges'
import type { SectionRenderCtx } from '../../utils/sectionRegistry'

// A quiet promise strip filed between hairlines — small-caps labels, a hush of a
// monochrome mark, no colour. Generous spacing carries it; the photography above does
// the talking.
const props = defineProps<{ config: MarqueeSection; ctx: SectionRenderCtx }>()
const items = computed(() => props.config.badges.map(resolveBadge))
</script>

<template>
  <section class="border-y border-(--t-rule)">
    <UContainer>
      <ul
        class="flex items-center justify-start gap-x-9 gap-y-2 overflow-x-auto py-4 text-[0.68rem] uppercase tracking-[0.18em] text-muted [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden"
      >
        <li v-for="(b, i) in items" :key="b.label + i" class="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          <UIcon :name="b.icon" class="size-3.5 text-muted/70" />
          <span>{{ b.label }}</span>
        </li>
      </ul>
    </UContainer>
  </section>
</template>
