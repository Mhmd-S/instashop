<script setup lang="ts">
import { formatPrice } from '~~/shared/types/product'

definePageMeta({ surface: 'store' })

const cart = useCart()
const cta = useStoreCta()
const subtotalMinor = ref(0)
const currency = ref('USD')
const priceMap = ref<Record<string, { available: boolean; unitPriceMinor: number }>>({})

async function revalidate() {
  if (!cart.items.length) {
    priceMap.value = {}
    subtotalMinor.value = 0
    return
  }
  const res = await $fetch('/api/storefront/cart/price', {
    method: 'POST',
    body: { items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
  })
  const m: Record<string, { available: boolean; unitPriceMinor: number }> = {}
  for (const l of res.lines) m[l.productId] = { available: l.available, unitPriceMinor: l.unitPriceMinor }
  priceMap.value = m
  subtotalMinor.value = res.subtotalMinor
  currency.value = res.currency
}

onMounted(revalidate)
watch(() => cart.items.map((i) => `${i.productId}:${i.quantity}`).join(','), revalidate)
</script>

<template>
  <main class="min-h-screen bg-default text-default">
    <StorefrontHeader />

    <UContainer class="max-w-3xl py-10">
      <StorefrontEyebrow>Your bag</StorefrontEyebrow>
      <h1 class="mt-2 font-heading text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">Your cart</h1>

      <ClientOnly>
        <div v-if="!cart.items.length" class="mt-10 py-16 text-center">
          <UIcon name="i-lucide-shopping-cart" class="mx-auto size-10 text-dimmed" />
          <p class="mt-3 text-muted">Your cart is empty.</p>
          <UButton to="/" label="Continue shopping" icon="i-lucide-arrow-left" v-bind="cta" color="primary" class="mt-5" />
        </div>

        <div v-else class="mt-6 space-y-6">
          <UCard :ui="{ body: 'divide-y divide-default p-0 sm:p-0' }">
            <div v-for="item in cart.items" :key="item.productId" class="flex items-center gap-4 p-4">
              <div class="size-20 shrink-0 overflow-hidden rounded-[var(--ui-radius)] border border-default bg-muted">
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" class="size-full object-cover">
                <div v-else class="grid size-full place-items-center text-dimmed"><UIcon name="i-lucide-image-off" class="size-5" /></div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-heading font-medium text-highlighted">{{ item.title }}</p>
                <UBadge
                  v-if="priceMap[item.productId] && !priceMap[item.productId].available"
                  color="error" variant="subtle" label="No longer available" class="mt-1"
                />
                <p v-else class="mt-0.5 text-sm text-muted">
                  {{ formatPrice(priceMap[item.productId]?.unitPriceMinor ?? item.unitPriceMinor, currency) }} each
                </p>
                <div class="mt-2 inline-flex items-center rounded-[var(--ui-radius)] border border-default">
                  <UButton
                    icon="i-lucide-minus" color="neutral" variant="ghost" size="xs"
                    aria-label="Decrease quantity" :disabled="item.quantity <= 1"
                    @click="cart.setQty(item.productId, item.quantity - 1)"
                  />
                  <span class="w-9 text-center text-sm font-medium tabular-nums">{{ item.quantity }}</span>
                  <UButton
                    icon="i-lucide-plus" color="neutral" variant="ghost" size="xs"
                    aria-label="Increase quantity" @click="cart.setQty(item.productId, item.quantity + 1)"
                  />
                </div>
              </div>
              <div class="flex flex-col items-end gap-2">
                <span class="font-semibold text-highlighted tabular-nums">
                  {{ formatPrice((priceMap[item.productId]?.unitPriceMinor ?? item.unitPriceMinor) * item.quantity, currency) }}
                </span>
                <UButton
                  icon="i-lucide-trash-2" color="neutral" variant="ghost" size="sm"
                  aria-label="Remove" @click="cart.remove(item.productId)"
                />
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between">
              <span class="text-muted">Subtotal</span>
              <span class="text-xl font-semibold text-highlighted tabular-nums">{{ formatPrice(subtotalMinor, currency) }}</span>
            </div>
            <p class="mt-1 text-xs text-muted">Shipping & taxes calculated at checkout.</p>
            <UButton to="/checkout" label="Checkout" color="primary" v-bind="cta" size="lg" block trailing-icon="i-lucide-arrow-right" class="mt-4" />
            <UButton to="/" label="Continue shopping" variant="link" color="neutral" size="sm" block class="mt-2" />
          </UCard>
        </div>
      </ClientOnly>
    </UContainer>
  </main>
</template>
