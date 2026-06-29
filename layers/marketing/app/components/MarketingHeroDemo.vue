<script setup lang="ts">
// Hero demo: the generated Chanis storefront in a browser window, floating on the
// weaved-gradient stage — with the seller's Instagram post hanging off the lower-left
// and an "auto-extracted →" chip bridging the two. That makes the whole pitch literal:
// the IG post (left) becomes the storefront (right), and the post's photo is the SAME
// shot that lands as the first product in the grid, so "post → product" reads at a glance.
// Reuses MOCK_SHOP so it stays consistent with the other marketing surfaces. The window
// tilts in on first view then settles flat; the IG post + chip fade in just after.
// Reduced-motion lands everything instantly.
import { useElementVisibility } from '@vueuse/core'

const root = ref<HTMLElement | null>(null)
const visible = useElementVisibility(root)
const settled = ref(false)
watch(visible, (v) => { if (v) settled.value = true })

const shop = MOCK_SHOP
// The post we show "becoming" the shop — same photo as the first product in the grid.
const source = shop.products[0]!
</script>

<template>
  <div
    ref="root"
    class="stage relative isolate rounded-mock p-4 shadow-float sm:p-6"
    :class="{ 'is-settled': settled }"
  >
    <!-- Weaved-gradient backdrop + a soft edge scrim so the white window reads crisply. -->
    <div class="absolute inset-0 -z-10 overflow-hidden rounded-mock" aria-hidden="true">
      <img src="/landing/weaved-hero.jpg" alt="" class="size-full object-cover">
      <div
        class="absolute inset-0"
        style="background: radial-gradient(120% 95% at 50% 18%, transparent 38%, rgba(24,12,46,0.30))"
      />
    </div>

    <!-- The generated storefront, in a browser window (mirrors the editorial template). -->
    <div class="frame relative overflow-hidden rounded-mock border border-white/25 bg-white shadow-mockup">
      <!-- Browser chrome -->
      <div class="flex items-center gap-1.5 border-b border-default bg-page px-3.5 py-2.5">
        <span class="size-2.5 rounded-full bg-red-400/70" />
        <span class="size-2.5 rounded-full bg-amber-400/70" />
        <span class="size-2.5 rounded-full bg-green-400/70" />
        <span class="ml-3 hidden truncate rounded bg-white px-2 py-0.5 text-xs text-ink-subtle ring-1 ring-default sm:block">
          {{ shop.domain }}
        </span>
      </div>

      <!-- Storefront content -->
      <div class="bg-white">
        <div class="flex items-center justify-between px-5 pt-4 pb-3">
          <span class="store-name text-[1rem] font-medium tracking-[-0.01em] text-ink">{{ shop.name }}</span>
          <span class="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-ink-subtle">Bag</span>
        </div>
        <div class="flex items-center gap-4 overflow-hidden border-y border-default px-5 py-2">
          <span
            v-for="(n, i) in shop.nav"
            :key="n"
            class="whitespace-nowrap text-[0.58rem] font-medium uppercase tracking-[0.16em]"
            :class="i === 0 ? 'border-b border-ink pb-px text-ink' : 'text-ink-subtle'"
          >{{ n }}</span>
        </div>
        <!-- Cap the grid and fade its foot so the demo stays compact and reads as a real,
             scrollable shop ("there's more") rather than running the hero too tall. -->
        <div class="max-h-72 overflow-hidden mask-[linear-gradient(to_bottom,#000_82%,transparent)]">
          <div class="grid grid-cols-2 gap-x-3.5 gap-y-4 p-5">
            <div v-for="p in shop.products.slice(0, 4)" :key="p.name" class="group">
              <div class="aspect-square overflow-hidden rounded-sm bg-page">
                <img
                  :src="p.image"
                  :alt="p.name"
                  loading="eager"
                  class="size-full object-cover transition duration-700 ease-soft motion-safe:group-hover:scale-[1.03]"
                >
              </div>
              <div class="mt-2 leading-tight">
                <p class="truncate text-[0.74rem] text-ink">{{ p.name }}</p>
                <p class="text-[0.74rem] text-ink-subtle tabular-nums">{{ p.price }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- The "before": the seller's Instagram post, floating off the window's lower-left,
         with an "auto-extracted →" chip pointing into the shop. Hidden on small screens to
         keep the stacked hero clean. -->
    <div class="ig-float absolute bottom-6 -left-4 z-20 hidden w-36 lg:block xl:-left-8 xl:w-40">
      <!-- transform connector: post → shop (we auto-extract; the seller just reviews) -->
      <div class="chip absolute -right-3 -top-3 z-10 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-float ring-1 ring-default">
        <span class="size-1.5 rounded-full" :style="{ background: 'var(--gradient-ig)' }" />
        <span class="text-[0.58rem] font-medium text-ink">auto-extracted</span>
        <UIcon name="i-lucide-arrow-right" class="size-3 text-primary" />
      </div>

      <!-- Instagram post card -->
      <div class="overflow-hidden rounded-2xl border border-default bg-white shadow-float">
        <!-- post header: gradient-ring avatar + @handle -->
        <div class="flex items-center gap-1.5 px-2.5 py-2">
          <span class="grid size-6 shrink-0 place-items-center rounded-full p-px" :style="{ background: 'var(--gradient-ig)' }">
            <span class="grid size-full place-items-center rounded-full bg-white text-[0.55rem] font-semibold text-ink">S</span>
          </span>
          <span class="text-[0.62rem] font-semibold text-ink">{{ shop.handle }}</span>
          <UIcon name="i-lucide-ellipsis" class="ml-auto size-3 text-ink-subtle" />
        </div>

        <!-- the post photo — the same shot that becomes the first product -->
        <div class="aspect-square overflow-hidden bg-page">
          <img :src="source.image" :alt="source.name" loading="lazy" class="size-full object-cover">
        </div>

        <!-- post actions + caption -->
        <div class="flex items-center gap-2.5 px-2.5 pt-2">
          <UIcon name="i-lucide-heart" class="size-3.5 text-ink" />
          <UIcon name="i-lucide-message-circle" class="size-3.5 text-ink" />
          <UIcon name="i-lucide-send" class="size-3.5 text-ink" />
          <UIcon name="i-lucide-bookmark" class="ml-auto size-3.5 text-ink" />
        </div>
        <div class="px-2.5 pb-2.5 pt-1.5 leading-snug">
          <p class="text-[0.58rem] font-semibold text-ink tabular-nums">1,204 likes</p>
          <p class="mt-0.5 truncate text-[0.58rem] text-ink-subtle">
            <span class="font-semibold text-ink">{{ shop.handle }}</span> New {{ source.name.toLowerCase() }} ✨
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  perspective: 1800px;
}
/* The editorial serif wordmark the storefront generates (apex has no tenant heading
   font, so opt into a system serif just for the mock store name). */
.store-name {
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
}
.frame {
  transform: rotateY(-7deg) rotateX(4deg);
  transition: transform 0.85s var(--ease-soft);
  will-change: transform;
}
.stage.is-settled .frame {
  transform: none;
}
/* The IG post + chip arrive just after the window settles. */
.ig-float {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
  transition:
    opacity 0.6s var(--ease-soft) 0.4s,
    transform 0.6s var(--ease-soft) 0.4s;
  will-change: opacity, transform;
}
.stage.is-settled .ig-float {
  opacity: 1;
  transform: none;
}
.chip {
  opacity: 0;
  transition: opacity 0.5s var(--ease-soft) 0.75s;
}
.stage.is-settled .chip {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .frame,
  .ig-float,
  .chip {
    transform: none;
    opacity: 1;
    transition: none;
  }
}
</style>
