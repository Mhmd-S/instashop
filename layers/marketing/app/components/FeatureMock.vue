<script setup lang="ts">
// Floating product-UI evidence panels paired with each feature row. Not stock
// screenshots — small, on-brand renders of real Chanis surfaces (import picker,
// brand editor, checkout) so the feature rows show the product, Stripe-style.
defineProps<{ kind: 'import' | 'brand' | 'checkout' }>()

const swatches = ['var(--ui-primary)', '#6b8f71', '#c97a54', '#2f3b4c', '#d8c7a1']
// Real photos from the shared demo shop (same shop as the hero / auth mocks).
const shop = MOCK_SHOP
const lead = shop.products[0]!
</script>

<template>
  <div class="overflow-hidden rounded-mock border border-default bg-white shadow-float">
    <!-- Import from Instagram -->
    <template v-if="kind === 'import'">
      <div class="flex items-center justify-between border-b border-default bg-page px-4 py-3">
        <div class="flex items-center gap-2">
          <span class="size-4 rounded-[5px]" :style="{ background: 'var(--gradient-ig)' }" />
          <span class="text-sm font-semibold text-ink">Import from Instagram</span>
        </div>
        <span class="text-xs text-ink-subtle tabular-nums">18 selected</span>
      </div>
      <div class="grid grid-cols-4 gap-2 p-4">
        <div
          v-for="n in 8"
          :key="n"
          class="relative aspect-square overflow-hidden rounded-lg ring-1 ring-default"
        >
          <img :src="shop.feed[(n - 1) % shop.feed.length]" alt="" loading="lazy" class="size-full object-cover">
          <span
            v-if="n % 4 !== 0"
            class="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-white ring-2 ring-white"
          >
            <UIcon name="i-lucide-check" class="size-2.5" />
          </span>
        </div>
      </div>
    </template>

    <!-- Brand matched automatically -->
    <template v-else-if="kind === 'brand'">
      <div class="flex items-center justify-between border-b border-default bg-page px-4 py-3">
        <span class="text-sm font-semibold text-ink">Brand</span>
        <span class="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary">Auto-matched</span>
      </div>
      <div class="space-y-4 p-4">
        <div>
          <p class="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-ink-subtle">Palette</p>
          <div class="mt-2 flex items-center gap-2">
            <span
              v-for="(c, i) in swatches"
              :key="c"
              class="size-7 rounded-full ring-1 ring-default"
              :class="i === 0 ? 'ring-2 ring-primary ring-offset-2' : ''"
              :style="{ background: c }"
            />
          </div>
        </div>
        <div class="flex items-end justify-between rounded-lg bg-page p-3 ring-1 ring-default">
          <div>
            <p class="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-ink-subtle">Typeface</p>
            <p class="text-lg font-semibold text-ink">Poppins</p>
          </div>
          <span class="text-2xl font-semibold text-ink/80">Aa</span>
        </div>
      </div>
    </template>

    <!-- Sell with real checkout -->
    <template v-else>
      <div class="flex items-center justify-between border-b border-default bg-page px-4 py-3">
        <span class="text-sm font-semibold text-ink">Checkout</span>
        <span class="flex items-center gap-1 text-xs text-ink-subtle">
          <UIcon name="i-lucide-lock" class="size-3" /> Secure · Stripe
        </span>
      </div>
      <div class="space-y-3 p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="size-9 overflow-hidden rounded-lg ring-1 ring-default">
              <img :src="lead.image" :alt="lead.name" class="size-full object-cover">
            </span>
            <div class="leading-tight">
              <p class="text-sm font-medium text-ink">{{ lead.name }}</p>
              <p class="text-xs text-ink-subtle">Qty 1</p>
            </div>
          </div>
          <span class="text-sm font-semibold text-ink tabular-nums">{{ lead.price }}</span>
        </div>
        <div class="flex items-center justify-between border-t border-default pt-3 text-sm">
          <span class="text-ink-muted">Total</span>
          <span class="font-semibold text-ink tabular-nums">{{ lead.price }}</span>
        </div>
        <div class="flex items-center gap-2 rounded-lg bg-page px-3 py-2.5 ring-1 ring-default">
          <UIcon name="i-lucide-credit-card" class="size-4 text-ink-subtle" />
          <span class="text-sm text-ink-muted tabular-nums">•••• •••• •••• 4242</span>
        </div>
        <div class="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white">
          <UIcon name="i-lucide-lock" class="size-3.5" /> Pay {{ lead.price }}
        </div>
      </div>
    </template>
  </div>
</template>
