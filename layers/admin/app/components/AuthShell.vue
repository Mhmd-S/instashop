<script setup lang="ts">
// Split-screen chrome for the auth pages (login / signup): the form lives in the
// default slot on the left; a branded gradient panel with a floating storefront
// preview sits on the right (hidden on small screens). Uses the marketing design
// tokens (global), so auth matches the apex site.
const { apex } = useSurfaceUrls()
const year = 2026

// The same demo shop the marketing hero portrays (real photos under public/marketing),
// shown here as the editorial storefront Chanis actually generates.
const shop = MOCK_SHOP
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <!-- Form column -->
    <div class="flex min-h-screen flex-col bg-page px-6 py-8 sm:px-10">
      <a :href="apex" class="inline-flex w-fit" aria-label="Chanis home"><BrandLogo /></a>
      <div class="flex flex-1 items-center justify-center py-10">
        <div class="w-full max-w-sm">
          <slot />
        </div>
      </div>
      <p class="text-cap text-ink-subtle">© {{ year }} Chanis</p>
    </div>

    <!-- Brand panel -->
    <div class="relative hidden overflow-hidden bg-immersion lg:block">
      <div
        class="pointer-events-none absolute inset-0 opacity-55 blur-[90px]"
        :style="{
          background: 'var(--gradient-ig-halo)',
          maskImage: 'radial-gradient(80% 80% at 78% 30%, black, transparent)',
        }"
        aria-hidden="true"
      />
      <div class="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">

        <div class="max-w-md">
          <h2 class="text-h2 font-semibold text-white text-balance">Turn your Instagram into a shop.</h2>
          <p class="mt-4 text-white/70">
            Paste your page — we import your posts as products and match your brand. Real checkout, ready in minutes.
          </p>

          <!-- Floating storefront preview — the editorial site Chanis generates -->
          <div class="mt-9 w-72 overflow-hidden rounded-mock border border-white/10 bg-white shadow-mockup">
            <!-- Store header: wordmark + bag -->
            <div class="flex items-center justify-between px-4 pt-3.5 pb-3">
              <span class="store-name text-sm font-medium tracking-[-0.01em] text-ink">{{ shop.name }}</span>
              <span class="text-[0.55rem] font-medium uppercase tracking-[0.18em] text-ink-subtle">Bag</span>
            </div>
            <!-- Category nav (mirrors the real storefront) -->
            <div class="flex items-center gap-3.5 overflow-hidden border-y border-default px-4 py-1.5">
              <span
                v-for="(n, i) in shop.nav.slice(0, 4)"
                :key="n"
                class="whitespace-nowrap text-[0.52rem] font-medium uppercase tracking-[0.14em]"
                :class="i === 0 ? 'border-b border-ink pb-px text-ink' : 'text-ink-subtle'"
              >{{ n }}</span>
            </div>
            <!-- Editorial product grid: real photos, title + muted price beneath -->
            <div class="grid grid-cols-2 gap-x-2.5 gap-y-3 p-4">
              <div v-for="p in shop.products" :key="p.name">
                <div class="aspect-square overflow-hidden bg-page">
                  <img :src="p.image" :alt="p.name" loading="lazy" class="size-full object-cover">
                </div>
                <div class="mt-1.5 leading-tight">
                  <p class="truncate text-[0.66rem] text-ink">{{ p.name }}</p>
                  <p class="text-[0.66rem] text-ink-subtle tabular-nums">{{ p.price }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Evoke the editorial serif wordmark the storefront generates (auth pages have no
   tenant heading font, so opt into a system serif just for the mock store name). */
.store-name {
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
}
</style>
