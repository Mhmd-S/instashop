<script setup lang="ts">
import type { Testimonial } from '../utils/marketing'
defineProps<{ testimonial: Testimonial }>()
</script>

<template>
  <figure class="flex h-full flex-col rounded-card border border-default bg-white p-6 shadow-card transition duration-200 ease-stripe hover:-translate-y-0.75 hover:shadow-float">
    <UIcon name="i-lucide-quote" class="size-6 text-primary/60" />
    <blockquote class="mt-3 flex-1 text-ink">{{ testimonial.quote }}</blockquote>
    <figcaption class="mt-5 flex items-center gap-3">
      <span class="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {{ testimonial.name.charAt(0) }}
      </span>
      <span class="text-sm leading-tight">
        <span class="block font-medium text-ink">{{ testimonial.name }}</span>
        <span class="block text-ink-subtle">{{ testimonial.role }} · {{ testimonial.handle }}</span>
      </span>
    </figcaption>
  </figure>
</template>
