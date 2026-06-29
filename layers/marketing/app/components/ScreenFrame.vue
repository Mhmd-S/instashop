<script setup lang="ts">
// A device/browser frame for the screenshots page. We don't ship stock screenshots;
// instead each frame is a labelled, on-brand placeholder describing a real surface of
// the product. `kind` switches the chrome (desktop window, phone, or a video still).
import type { Shot } from '../utils/marketing'
defineProps<{ shot: Shot }>()
</script>

<template>
  <figure class="group">
    <!-- Desktop browser window -->
    <div
      v-if="shot.kind === 'desktop'"
      class="overflow-hidden rounded-mock border border-default bg-white shadow-card transition duration-300 ease-stripe group-hover:-translate-y-1 group-hover:shadow-float"
    >
      <div class="flex items-center gap-1.5 border-b border-default bg-page px-3 py-2.5">
        <span class="size-2.5 rounded-full bg-red-400/70" />
        <span class="size-2.5 rounded-full bg-amber-400/70" />
        <span class="size-2.5 rounded-full bg-green-400/70" />
        <span class="ml-3 hidden truncate rounded bg-white px-2 py-0.5 text-xs text-ink-subtle ring-1 ring-default sm:block">app.chanis.app</span>
      </div>
      <div class="grid aspect-[16/10] place-items-center bg-[linear-gradient(135deg,color-mix(in_oklab,var(--ui-primary)_12%,white),white)]">
        <UIcon name="i-lucide-layout-dashboard" class="size-12 text-primary/70" />
      </div>
    </div>

    <!-- Phone -->
    <div
      v-else-if="shot.kind === 'mobile'"
      class="mx-auto w-full max-w-[15rem] overflow-hidden rounded-[2rem] border-4 border-default bg-white p-1.5 shadow-card transition duration-300 ease-stripe group-hover:-translate-y-1 group-hover:shadow-float"
    >
      <div class="overflow-hidden rounded-[1.5rem]">
        <div class="flex items-center justify-center bg-page py-2">
          <span class="h-1.5 w-16 rounded-full bg-default" />
        </div>
        <div class="grid aspect-[9/16] place-items-center bg-[linear-gradient(160deg,color-mix(in_oklab,var(--ui-primary)_14%,white),white)]">
          <UIcon name="i-lucide-shopping-bag" class="size-10 text-primary/70" />
        </div>
      </div>
    </div>

    <!-- Video still -->
    <div
      v-else
      class="relative overflow-hidden rounded-mock border border-default shadow-card transition duration-300 ease-stripe group-hover:-translate-y-1 group-hover:shadow-float"
    >
      <div class="grid aspect-video place-items-center bg-[linear-gradient(135deg,color-mix(in_oklab,var(--ui-primary)_18%,white),color-mix(in_oklab,var(--color-accent)_10%,white))]">
        <span class="grid size-14 place-items-center rounded-full bg-white/90 shadow-float transition group-hover:scale-105">
          <UIcon name="i-lucide-play" class="size-6 translate-x-0.5 text-primary" />
        </span>
      </div>
      <span class="absolute right-2 top-2 rounded bg-white/80 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-ink-subtle">Video</span>
    </div>

    <figcaption class="mt-3">
      <p class="font-medium text-ink">{{ shot.title }}</p>
      <p class="mt-0.5 text-sm text-ink-muted">{{ shot.caption }}</p>
    </figcaption>
  </figure>
</template>
