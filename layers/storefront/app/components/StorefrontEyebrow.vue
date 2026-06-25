<script setup lang="ts">
// The small uppercase section kicker ("— Shop by category") used across the
// storefront. Its tracking, weight and whether it carries the accent rule all come
// from the store's mood (useStoreMood), so every section stays on-vibe.
withDefaults(defineProps<{ align?: 'left' | 'center' }>(), { align: 'left' })
const pres = useStoreMood()
</script>

<template>
  <p
    class="flex items-center gap-2.5 text-muted"
    :class="[pres.eyebrow.label, align === 'center' ? 'justify-center' : '']"
  >
    <span v-if="pres.eyebrow.rule" class="h-px bg-accent" :class="pres.expressive ? 'w-10' : 'w-7'" />
    <slot />
  </p>
</template>
