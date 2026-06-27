<script setup lang="ts">
// Consistent page header (eyebrow + title + lede) for the marketing content pages.
defineProps<{ eyebrow?: string; title: string; lede?: string }>()
</script>

<template>
  <section class="border-b border-default bg-[color-mix(in_oklab,var(--ui-primary)_4%,var(--ui-bg))]">
    <UContainer class="py-16 sm:py-20">
      <div class="mx-auto max-w-3xl text-center">
        <p v-if="eyebrow" class="text-sm font-semibold uppercase tracking-wide text-primary">{{ eyebrow }}</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight text-highlighted text-balance sm:text-5xl">{{ title }}</h1>
        <p v-if="lede" class="mx-auto mt-5 max-w-2xl text-lg text-muted text-balance">{{ lede }}</p>
        <slot />
      </div>
    </UContainer>
  </section>
</template>
