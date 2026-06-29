<script setup lang="ts">
// Reusable closing CTA: a dark immersion card with the Instagram-gradient halo
// glowing behind it. Shared by content pages (case studies, blog posts) so every
// page ends on the same branded note. Links to signup on the admin host.
withDefaults(defineProps<{ title: string, body?: string, label?: string }>(), {
  label: 'Get started',
})
const { adminUrl } = useSurfaceUrls()
</script>

<template>
  <div class="relative overflow-hidden rounded-mock bg-immersion p-10 text-center sm:p-12">
    <div
      class="pointer-events-none absolute inset-0 opacity-45 blur-[80px]"
      :style="{
        background: 'var(--gradient-ig-halo)',
        maskImage: 'radial-gradient(80% 90% at 50% 18%, black, transparent)',
      }"
      aria-hidden="true"
    />
    <div class="relative">
      <h2 class="text-h2 font-semibold text-white text-balance">{{ title }}</h2>
      <p v-if="body" class="mx-auto mt-3 max-w-md text-white/70">{{ body }}</p>
      <UButton
        :to="adminUrl('/signup')"
        external
        :label="label"
        color="primary"
        size="xl"
        trailing-icon="i-lucide-arrow-right"
        class="mt-7 shadow-float"
      />
    </div>
  </div>
</template>
