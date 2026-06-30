<script setup lang="ts">
import { formatPrice } from '~~/shared/types/product'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
const { data } = await useFetch(`/api/admin/stores/${storeId}/orders`)
const orders = computed(() => data.value?.orders ?? [])

function pill(s: string) {
  if (['paid', 'active', 'fulfilled', 'succeeded'].includes(s)) return 'bg-emerald-100 text-emerald-700'
  if (['pending', 'unpaid', 'processing'].includes(s)) return 'bg-amber-100 text-amber-700'
  if (s === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-ink/10 text-ink-muted'
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Orders</h1>
        <p class="mt-1 text-sm text-ink-muted">Track and fulfill every order placed in your store.</p>
      </div>
    </div>

    <div v-if="!orders.length" class="mt-6 rounded-xl border border-default bg-white py-12 text-center">
      <UIcon name="i-lucide-shopping-cart" class="mx-auto size-8 text-ink-subtle" />
      <p class="mt-2 text-sm text-ink-muted">No orders yet.</p>
    </div>

    <div v-else class="mt-6 overflow-hidden rounded-xl border border-default bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default text-left text-cap uppercase tracking-widest text-ink-subtle">
            <th class="px-5 py-2.5 font-medium">Order</th>
            <th class="px-5 py-2.5 font-medium">Customer</th>
            <th class="px-5 py-2.5 font-medium">Total</th>
            <th class="px-5 py-2.5 font-medium">Status</th>
            <th class="px-5 py-2.5 font-medium">Payment</th>
            <th class="px-5 py-2.5 font-medium">Placed</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id" class="border-b border-default transition last:border-0 hover:bg-black/5">
            <td class="px-5 py-3">
              <ULink :to="`/stores/${storeId}/orders/${o.id}`" class="font-medium text-ink hover:text-primary">
                {{ o.order_number }}
              </ULink>
            </td>
            <td class="px-5 py-3 text-ink-muted">{{ o.contact_name || o.contact_email || '—' }}</td>
            <td class="px-5 py-3 tabular-nums text-ink">{{ formatPrice(o.total_minor, o.currency) }}</td>
            <td class="px-5 py-3">
              <span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize" :class="pill(o.status)">{{ o.status }}</span>
            </td>
            <td class="px-5 py-3">
              <span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize" :class="pill(o.payment_status)">{{ o.payment_status }}</span>
            </td>
            <td class="px-5 py-3 text-ink-subtle">{{ o.placed_at.slice(0, 10) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
