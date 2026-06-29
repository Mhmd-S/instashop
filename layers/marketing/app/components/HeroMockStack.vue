<script setup lang="ts">
// The hero's signature move: a real Chanis storefront window floating over the
// Instagram-gradient halo, with the seller's IG feed tile flowing into it — the
// "post → shop" transform rendered literally. The window mirrors the editorial
// storefront we actually generate (oversized serif wordmark, hairline category nav,
// real product photography). On first paint the tilted frame straightens and settles;
// the feed tile + arrow slide in just after. The static end-state is complete on its
// own (reduced-motion just lands it instantly).
import { useElementVisibility } from '@vueuse/core'

const root = ref<HTMLElement | null>(null)
const visible = useElementVisibility(root)
const settled = ref(false)
watch(visible, (v) => { if (v) settled.value = true })

// The same demo shop every marketing mock portrays (real photos under public/marketing).
const shop = MOCK_SHOP
</script>

<template>
  <div ref="root" class="stage  w-full h-full flex flex-col items-center justify-center gap-6 lg:flex-row lg:justify-between lg:gap-0" :class="{ 'is-settled': settled }">

    <!-- Instagram profile mock — the "before", hanging off the window's lower-left into
         open canvas: handle bar, avatar + post/follower/following counts, bio, Follow/
         Message actions and the post grid. The "extracted →" badge rides between it and
         the window so the whole profile→shop transform reads as one unit. -->
    <div
      class="tile w-52 overflow-hidden rounded-2xl border border-default bg-white shadow-float">
      <!-- Profile top bar: @handle + overflow menu, like IG's mobile header -->
      <div class="flex items-center justify-between border-b border-default px-3.5 py-2">
        <span class="flex items-center gap-1 text-[0.72rem] font-semibold text-ink">
          @{{ shop.handle }}
          <UIcon name="i-lucide-chevron-down" class="size-3 text-ink-subtle" />
        </span>
        <UIcon name="i-lucide-ellipsis" class="size-3.5 text-ink-subtle" />
      </div>

      <div class="px-3.5 pb-3 pt-3">
        <!-- Avatar + post/follower/following counts -->
        <div class="flex items-center gap-3">
          <span class="grid size-12 shrink-0 place-items-center rounded-full p-0.5"
            :style="{ background: 'var(--gradient-ig)' }">
            <span
              class="grid size-full place-items-center rounded-full bg-white text-[0.85rem] font-semibold text-ink">S</span>
          </span>
          <div class="flex flex-1 justify-around text-center">
            <div class="leading-tight">
              <p class="text-[0.74rem] font-semibold text-ink tabular-nums">{{ shop.ig.posts }}</p>
              <p class="text-[0.54rem] text-ink-subtle">posts</p>
            </div>
            <div class="leading-tight">
              <p class="text-[0.74rem] font-semibold text-ink tabular-nums">{{ shop.ig.followers }}</p>
              <p class="text-[0.54rem] text-ink-subtle">followers</p>
            </div>
            <div class="leading-tight">
              <p class="text-[0.74rem] font-semibold text-ink tabular-nums">{{ shop.ig.following }}</p>
              <p class="text-[0.54rem] text-ink-subtle">following</p>
            </div>
          </div>
        </div>

        <!-- Display name + bio -->
        <div class="mt-2.5 leading-snug">
          <p class="text-[0.7rem] font-semibold text-ink">{{ shop.name }}</p>
          <p class="text-[0.62rem] text-ink-subtle">{{ shop.tagline }}</p>
        </div>

        <!-- Follow / message actions -->
        <div class="mt-2.5 flex gap-1.5">
          <span class="flex-1 rounded-md bg-[#0095f6] py-1 text-center text-[0.6rem] font-semibold text-white">Follow</span>
          <span
            class="flex-1 rounded-md bg-page py-1 text-center text-[0.6rem] font-semibold text-ink ring-1 ring-default">Message</span>
        </div>
      </div>

      <!-- Feed grid — flush, hairline gutters like the real Instagram grid -->
      <div class="grid grid-cols-3 gap-px">
        <span v-for="n in 6" :key="n" class="aspect-square overflow-hidden bg-page">
          <img :src="shop.feed[(n - 1) % shop.feed.length]" alt="" loading="lazy" class="size-full object-cover">
        </span>
      </div>
    </div>

    <!-- The transform: feed → shop -->
    <div
      class="chip  z-10 hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-float ring-1 ring-default lg:flex">
      <span class="size-2 rounded-full" :style="{ background: 'var(--gradient-ig)' }" />
      <span class="text-[0.7rem] font-medium text-ink">extracted automatically</span>
      <UIcon name="i-lucide-arrow-right" class="size-3.5 text-primary" />
    </div>

    <!-- Storefront window — the generated site, floating. In-flow so it gives the stage
         its real height (the tile/chip %-offsets anchor off this window). -->
    <div class="frame w-full lg:w-3/5 relative overflow-hidden rounded-mock border border-white/25 bg-white shadow-mockup">
      <!-- Browser chrome -->
      <div class="flex items-center gap-1.5 border-b border-default bg-page px-3.5 py-2.5">
        <span class="size-2.5 rounded-full bg-red-400/70" />
        <span class="size-2.5 rounded-full bg-amber-400/70" />
        <span class="size-2.5 rounded-full bg-green-400/70" />
        <span
          class="ml-3 hidden truncate rounded bg-white px-2 py-0.5 text-xs text-ink-subtle ring-1 ring-default sm:block">
          {{ shop.domain }}
        </span>
      </div>

      <!-- Storefront content — the editorial "Atelier" template -->
      <div class="bg-white">
        <!-- Store header: wordmark + bag -->
        <div class="flex items-center justify-between px-5 pt-4 pb-3">
          <span class="store-name text-[0.98rem] font-medium tracking-[-0.01em] text-ink">{{ shop.name }}</span>
          <span class="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-ink-subtle">Bag</span>
        </div>
        <!-- Category nav (mirrors the real StorefrontHeader's second row) -->
        <div class="flex items-center gap-4 overflow-hidden border-y border-default px-5 py-2">
          <span v-for="(n, i) in shop.nav" :key="n"
            class="whitespace-nowrap text-[0.58rem] font-medium uppercase tracking-[0.16em]"
            :class="i === 0 ? 'border-b border-ink pb-px text-ink' : 'text-ink-subtle'">{{ n }}</span>
        </div>

        <!-- Editorial product grid: real photos, title + muted price beneath. Two-up on
             mobile, a single editorial row on wider screens so the window stays compact. -->
        <div class="grid grid-cols-2 gap-x-3.5 gap-y-4 p-5 sm:grid-cols-4 sm:gap-x-3">
          <div v-for="p in shop.products" :key="p.name" class="group">
            <div class="aspect-square overflow-hidden bg-page">
              <img :src="p.image" :alt="p.name" loading="eager"
                class="size-full object-cover transition duration-700 ease-soft motion-safe:group-hover:scale-[1.03]">
            </div>
            <div class="mt-2 leading-tight">
              <p class="truncate text-[0.72rem] text-ink">{{ p.name }}</p>
              <p class="text-[0.72rem] text-ink-subtle tabular-nums">{{ p.price }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  perspective: 1800px;
}

/* Evoke the editorial serif wordmark the storefront generates (apex has no tenant
   heading font, so opt into a system serif just for the mock store name). */
.store-name {
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
}

.frame {
  transform: rotateY(-7deg) rotateX(5deg);
  transition: transform 0.85s var(--ease-soft);
  will-change: transform;
}

.stage.is-settled .frame {
  transform: none;
}

.tile,
.chip {
  opacity: 0;
  transition:
    opacity 0.6s var(--ease-soft) 0.35s,
    transform 0.6s var(--ease-soft) 0.35s;
}

.chip {
  transition-delay: 0.5s;
}

.stage.is-settled .tile,
.stage.is-settled .chip {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {

  .frame,
  .tile,
  .chip {
    transform: none;
    opacity: 1;
    transition: none;
  }
}
</style>
