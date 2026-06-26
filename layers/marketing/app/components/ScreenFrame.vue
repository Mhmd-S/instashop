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
      class="overflow-hidden rounded-xl border border-default bg-elevated shadow-sm transition group-hover:shadow-md"
    >
      <div class="flex items-center gap-1.5 border-b border-default bg-default px-3 py-2.5">
        <span class="size-2.5 rounded-full bg-red-400/70" />
        <span class="size-2.5 rounded-full bg-amber-400/70" />
        <span class="size-2.5 rounded-full bg-green-400/70" />
        <span class="ml-3 hidden truncate rounded bg-muted px-2 py-0.5 text-xs text-dimmed sm:block">app.chanis.app</span>
      </div>
      <div class="grid aspect-[16/10] place-items-center bg-[linear-gradient(135deg,color-mix(in_oklab,var(--ui-primary)_12%,var(--ui-bg)),var(--ui-bg))]">
        <UIcon name="i-lucide-layout-dashboard" class="size-12 text-primary/70" />
      </div>
    </div>

    <!-- Phone -->
    <div
      v-else-if="shot.kind === 'mobile'"
      class="mx-auto w-full max-w-[15rem] overflow-hidden rounded-[2rem] border-4 border-default bg-elevated p-1.5 shadow-sm transition group-hover:shadow-md"
    >
      <div class="overflow-hidden rounded-[1.5rem]">
        <div class="flex items-center justify-center bg-default py-2">
          <span class="h-1.5 w-16 rounded-full bg-muted" />
        </div>
        <div class="grid aspect-[9/16] place-items-center bg-[linear-gradient(160deg,color-mix(in_oklab,var(--ui-primary)_14%,var(--ui-bg)),var(--ui-bg))]">
          <UIcon name="i-lucide-shopping-bag" class="size-10 text-primary/70" />
        </div>
      </div>
    </div>

    <!-- Video still -->
    <div
      v-else
      class="relative overflow-hidden rounded-xl border border-default shadow-sm transition group-hover:shadow-md"
    >
      <div class="grid aspect-video place-items-center bg-[linear-gradient(135deg,color-mix(in_oklab,var(--ui-primary)_18%,var(--ui-bg)),color-mix(in_oklab,var(--color-accent)_10%,var(--ui-bg)))]">
        <span class="grid size-14 place-items-center rounded-full bg-default/90 shadow-md transition group-hover:scale-105">
          <UIcon name="i-lucide-play" class="size-6 translate-x-0.5 text-primary" />
        </span>
      </div>
      <span class="absolute right-2 top-2 rounded bg-default/80 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted">Video</span>
    </div>

    <figcaption class="mt-3">
      <p class="font-medium text-highlighted">{{ shot.title }}</p>
      <p class="mt-0.5 text-sm text-muted">{{ shot.caption }}</p>
    </figcaption>
  </figure>
</template>
