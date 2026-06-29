<script setup lang="ts">
// Consistent page header (eyebrow + title + lede) for the marketing content pages.
defineProps<{ eyebrow?: string; title: string; lede?: string }>()
</script>

<template>
  <section class="relative overflow-hidden border-b border-default bg-tint">
    <!-- Soft Instagram-gradient glow behind the title — the brand's signature, subtly. -->
    <div
      class="pointer-events-none absolute left-1/2 top-0 h-64 w-176 max-w-full -translate-x-1/2 opacity-40 blur-[72px]"
      :style="{ background: 'var(--gradient-ig-halo)' }"
      aria-hidden="true"
    />
    <UContainer class="relative py-20 sm:py-24">
      <div class="mx-auto max-w-3xl text-center">
        <p v-if="eyebrow" class="text-cap font-medium uppercase tracking-[0.08em] text-primary">{{ eyebrow }}</p>
        <h1 class="mt-3 text-hero font-semibold text-ink text-balance">{{ title }}</h1>
        <p v-if="lede" class="mx-auto mt-5 max-w-2xl text-lead text-ink-muted text-balance">{{ lede }}</p>
        <slot />
      </div>
    </UContainer>
  </section>
</template>
