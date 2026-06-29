<script setup lang="ts">
// "See it in action" showcase: a real Chanis surface floats on a vivid gradient stage
// (one of the landing background images), ringed by callout cards naming what the seller
// gets — the Stripe-style product shot. Two variants:
//   • storefront — the generated shop (Sage Studio demo, real photography)
//   • dashboard  — the seller's admin: orders, payouts, revenue
// Both reuse MOCK_SHOP so the demo stays consistent across the marketing surfaces.
interface Callout { icon: string, title: string, body: string }
withDefaults(defineProps<{
  bg: string
  variant?: 'storefront' | 'dashboard'
  eyebrow?: string
  title?: string
  lead?: string
  callouts?: Callout[]
}>(), { variant: 'storefront', callouts: () => [] })

const shop = MOCK_SHOP
// lg floating positions for up to three callouts (gutters + overlapping window edges).
const spots = ['left-4 top-24', 'right-4 top-10', 'right-12 bottom-12']

// Dashboard-variant demo data (marketing mock — believable, not live).
const stats = [
  { label: 'Revenue · 30d', value: '£2,340' },
  { label: 'Orders', value: '38' },
  { label: 'To pay out', value: '£1,120' },
]
const orders = [
  { customer: 'Mara L.', item: 'Stoneware mug', total: '£38.00', status: 'Paid' },
  { customer: 'Theo & Sam', item: 'Dinner plates', total: '£48.00', status: 'Fulfilled' },
  { customer: 'Priya N.', item: 'Serving bowls', total: '£56.00', status: 'Paid' },
  { customer: 'Devon R.', item: 'Bud vase', total: '£44.00', status: 'Refunded' },
]
const badge: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Fulfilled: 'bg-primary/10 text-primary',
  Refunded: 'bg-ink/10 text-ink-muted',
}
const nav = ['Dashboard', 'Orders', 'Products', 'Payments', 'Settings']
</script>

<template>
  <section class="py-12 lg:py-18">
    <UContainer>
      <Reveal v-if="eyebrow || title || lead">
        <div class="mx-auto max-w-2xl text-center">
          <p v-if="eyebrow" class="text-cap font-medium uppercase tracking-[0.12em] text-ink-subtle">{{ eyebrow }}</p>
          <h2 v-if="title" class="mt-3 text-h2 font-semibold text-ink text-balance">{{ title }}</h2>
          <p v-if="lead" class="mx-auto mt-4 max-w-xl text-lead text-ink-muted">{{ lead }}</p>
        </div>
      </Reveal>

      <Reveal :delay="80">
        <div class="stage relative isolate mt-8 rounded-mock p-6 shadow-float sm:p-8 lg:mt-10 lg:p-10">
          <!-- gradient image backdrop + a soft edge scrim so the white window/cards read
               crisply. Clipped to the rounded frame in its own wrapper so the storefront's
               overhanging IG-feed tile can spill past the stage. -->
          <div class="absolute inset-0 -z-10 overflow-hidden rounded-mock" aria-hidden="true">
            <img :src="bg" alt="" class="size-full object-cover">
            <div class="absolute inset-0"
              style="background: radial-gradient(120% 95% at 50% 25%, transparent 45%, rgba(24,12,46,0.28))" />
          </div>

          <!-- ── Storefront variant ─────────────────────────────────────────── -->
          <!-- The real "post → shop" hero piece: the generated storefront window with the
               seller's IG feed tile flowing into it, floating on the gradient stage. -->
          <div v-if="variant === 'storefront'"
            class="relative flex h-[50vh] items-center justify-center mx-auto w-full min-w-2xl pb-6 sm:pb-2">
            <HeroMockStack class="w-full" />
          </div>

          <!-- ── Dashboard variant ──────────────────────────────────────────── -->
          <div v-else class="relative mx-auto w-full max-w-3xl">
            <div class="overflow-hidden rounded-mock border border-white/25 bg-white shadow-mockup">
              <div class="flex items-center gap-1.5 border-b border-default bg-page px-3.5 py-2.5">
                <span class="size-2.5 rounded-full bg-red-400/70" />
                <span class="size-2.5 rounded-full bg-amber-400/70" />
                <span class="size-2.5 rounded-full bg-green-400/70" />
                <span
                  class="ml-3 hidden truncate rounded bg-white px-2 py-0.5 text-xs text-ink-subtle ring-1 ring-default sm:block">app.chanis.app</span>
              </div>
              <div class="flex bg-white">
                <!-- sidebar -->
                <aside class="hidden w-36 shrink-0 border-r border-default bg-page p-3 sm:block">
                  <div class="flex items-center gap-2 px-1 pb-3">
                    <span class="grid size-6 place-items-center rounded-md text-[0.6rem] font-semibold text-white"
                      :style="{ background: 'var(--gradient-ig)' }">S</span>
                    <span class="store-name truncate text-[0.8rem] font-medium text-ink">{{ shop.name }}</span>
                  </div>
                  <nav class="space-y-0.5">
                    <span v-for="(n, i) in nav" :key="n" class="block rounded-md px-2 py-1.5 text-[0.7rem] font-medium"
                      :class="i === 1 ? 'bg-primary/10 text-primary' : 'text-ink-muted'">{{ n }}</span>
                  </nav>
                </aside>
                <!-- main -->
                <div class="min-w-0 flex-1 p-4 sm:p-5">
                  <div class="flex items-center justify-between">
                    <p class="text-[0.95rem] font-semibold text-ink">Orders</p>
                    <span
                      class="rounded-full bg-page px-2 py-0.5 text-[0.6rem] font-medium text-ink-subtle ring-1 ring-default">Last
                      30 days</span>
                  </div>
                  <div class="mt-3 grid grid-cols-3 gap-2.5">
                    <div v-for="s in stats" :key="s.label" class="rounded-lg border border-default p-2.5">
                      <p class="text-[0.55rem] font-medium uppercase tracking-widest text-ink-subtle">{{ s.label }}</p>
                      <p class="mt-1 text-sm font-semibold tabular-nums text-ink">{{ s.value }}</p>
                    </div>
                  </div>
                  <div class="mt-4 overflow-hidden rounded-lg border border-default">
                    <div
                      class="grid grid-cols-[1.3fr_1.4fr_0.8fr_0.9fr] gap-2 border-b border-default bg-page px-3 py-2 text-[0.55rem] font-medium uppercase tracking-widest text-ink-subtle">
                      <span>Customer</span><span>Item</span><span class="text-right">Total</span><span
                        class="text-right">Status</span>
                    </div>
                    <div v-for="(o, i) in orders" :key="o.customer"
                      class="grid grid-cols-[1.3fr_1.4fr_0.8fr_0.9fr] items-center gap-2 px-3 py-2 text-[0.72rem]"
                      :class="i < orders.length - 1 ? 'border-b border-default' : ''">
                      <span class="truncate font-medium text-ink">{{ o.customer }}</span>
                      <span class="truncate text-ink-muted">{{ o.item }}</span>
                      <span class="text-right tabular-nums text-ink">{{ o.total }}</span>
                      <span class="text-right">
                        <span class="inline-block rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium"
                          :class="badge[o.status]">{{ o.status }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- callout cards: float around the window on lg, stack below otherwise -->
          <template v-if="callouts.length">
            <div class="pointer-events-none absolute inset-0 hidden lg:block">
              <div v-for="(c, i) in callouts.slice(0, 3)" :key="c.title"
                class="absolute w-60 rounded-card bg-white/95 p-4 shadow-float ring-1 ring-black/5 backdrop-blur"
                :class="spots[i]">
                <span class="grid size-8 place-items-center rounded-lg bg-primary/10">
                  <UIcon :name="c.icon" class="size-4 text-primary" />
                </span>
                <p class="mt-3 text-sm font-semibold text-ink">{{ c.title }}</p>
                <p class="mt-1 text-xs leading-relaxed text-ink-muted">{{ c.body }}</p>
              </div>
            </div>
            <div class="relative mt-6 grid gap-3 sm:grid-cols-3 lg:hidden">
              <div v-for="c in callouts.slice(0, 3)" :key="c.title"
                class="rounded-card bg-white/95 p-4 shadow-card ring-1 ring-black/5">
                <span class="grid size-8 place-items-center rounded-lg bg-primary/10">
                  <UIcon :name="c.icon" class="size-4 text-primary" />
                </span>
                <p class="mt-3 text-sm font-semibold text-ink">{{ c.title }}</p>
                <p class="mt-1 text-xs leading-relaxed text-ink-muted">{{ c.body }}</p>
              </div>
            </div>
          </template>
        </div>
      </Reveal>
    </UContainer>
  </section>
</template>

<style scoped>
/* The editorial serif wordmark the storefront generates (apex has no tenant heading
   font, so opt into a system serif just for the mock store name). */
.store-name {
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
}
</style>
