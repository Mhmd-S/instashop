<script setup lang="ts">
// The small uppercase section kicker ("— Shop by category") used across the
// storefront. Its tracking, weight and whether it carries the accent rule all come
// from the store's art direction (useStoreArtDirection → mood-derived eyebrow voice),
// so every section stays on-vibe.
withDefaults(defineProps<{ align?: 'left' | 'center' }>(), { align: 'left' })
const ad = useStoreArtDirection()
</script>

<template>
  <p
    class="flex items-center gap-2.5 text-muted"
    :class="[ad.eyebrow.label, align === 'center' ? 'justify-center' : '']"
  >
    <span v-if="ad.eyebrow.rule" class="h-px bg-accent" :class="ad.expressive ? 'w-10' : 'w-7'" />
    <slot />
  </p>
</template>
