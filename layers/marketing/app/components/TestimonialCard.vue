<script setup lang="ts">
import type { Testimonial } from '../utils/marketing'
defineProps<{ testimonial: Testimonial }>()
</script>

<template>
  <UCard variant="subtle" class="h-full">
    <UIcon name="i-lucide-quote" class="size-6 text-primary/60" />
    <blockquote class="mt-3 text-highlighted">{{ testimonial.quote }}</blockquote>
    <figcaption class="mt-4 flex items-center gap-3">
      <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {{ testimonial.name.charAt(0) }}
      </span>
      <span class="text-sm leading-tight">
        <span class="block font-medium text-highlighted">{{ testimonial.name }}</span>
        <span class="block text-muted">{{ testimonial.role }} · {{ testimonial.handle }}</span>
      </span>
    </figcaption>
  </UCard>
</template>
