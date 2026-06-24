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
      <h1 class="text-2xl font-semibold font-heading tracking-tight text-highlighted">Your cart</h1>

      <ClientOnly>
        <div v-if="!cart.items.length" class="mt-10 text-center py-16">
          <UIcon name="i-lucide-shopping-cart" class="size-10 text-dimmed mx-auto" />
          <p class="mt-3 text-muted">Your cart is empty.</p>
          <UButton to="/" label="Continue shopping" icon="i-lucide-arrow-left" variant="soft" color="neutral" class="mt-4" />
        </div>

        <div v-else class="mt-6 space-y-6">
          <UCard :ui="{ body: 'divide-y divide-default p-0 sm:p-0' }">
            <div v-for="item in cart.items" :key="item.productId" class="p-4 flex items-center gap-4">
              <div class="w-16 h-16 rounded-lg overflow-hidden bg-muted border border-default shrink-0">
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" class="w-full h-full object-cover">
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-highlighted truncate">{{ item.title }}</p>
                <UBadge
                  v-if="priceMap[item.productId] && !priceMap[item.productId].available"
                  color="error" variant="subtle" label="No longer available" class="mt-1"
                />
                <p v-else class="text-sm text-muted mt-0.5">
                  {{ formatPrice(priceMap[item.productId]?.unitPriceMinor ?? item.unitPriceMinor, currency) }}
                </p>
              </div>
              <UInput
                type="number" :min="1" :model-value="item.quantity"
                class="w-20" :ui="{ base: 'text-center' }"
                @change="(e: Event) => cart.setQty(item.productId, Number((e.target as HTMLInputElement).value))"
              />
              <UButton
                icon="i-lucide-trash-2" color="neutral" variant="ghost" size="sm"
                aria-label="Remove" @click="cart.remove(item.productId)"
              />
            </div>
          </UCard>

          <div class="flex items-center justify-between">
            <span class="text-muted">Subtotal</span>
            <span class="text-lg font-semibold text-highlighted">{{ formatPrice(subtotalMinor, currency) }}</span>
          </div>

          <UButton to="/checkout" label="Checkout" color="primary" v-bind="cta" size="lg" block trailing-icon="i-lucide-arrow-right" />
        </div>
      </ClientOnly>
    </UContainer>
  </main>
</template>
