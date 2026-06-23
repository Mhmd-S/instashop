<script setup lang="ts">
import { formatPrice } from '~~/shared/types/product'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
const { data } = await useFetch(`/api/admin/stores/${storeId}/orders`)
const orders = computed(() => data.value?.orders ?? [])
</script>

<template>
  <div>
    <UButton to="/dashboard" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" label="Dashboard" class="-ml-2 mb-2" />
    <h1 class="text-2xl font-bold text-highlighted">Orders</h1>

    <UCard v-if="!orders.length" class="mt-6">
      <div class="text-center py-12">
        <UIcon name="i-lucide-shopping-cart" class="size-10 text-dimmed mx-auto" />
        <p class="mt-3 text-muted">No orders yet.</p>
      </div>
    </UCard>

    <UCard v-else class="mt-6" :ui="{ body: 'p-0 sm:p-0' }">
      <table class="w-full text-sm">
        <thead class="text-left text-muted border-b border-default">
          <tr>
            <th class="px-4 py-3 font-medium">Order</th>
            <th class="px-4 py-3 font-medium">Customer</th>
            <th class="px-4 py-3 font-medium">Total</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Payment</th>
            <th class="px-4 py-3 font-medium">Placed</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id" class="border-b border-default last:border-0">
            <td class="px-4 py-3">
              <ULink :to="`/stores/${storeId}/orders/${o.id}`" class="font-medium text-highlighted hover:text-primary">
                {{ o.order_number }}
              </ULink>
            </td>
            <td class="px-4 py-3 text-default">{{ o.contact_name || o.contact_email || '—' }}</td>
            <td class="px-4 py-3 text-default">{{ formatPrice(o.total_minor, o.currency) }}</td>
            <td class="px-4 py-3"><UBadge color="neutral" variant="subtle" class="capitalize" :label="o.status" /></td>
            <td class="px-4 py-3"><UBadge color="neutral" variant="subtle" class="capitalize" :label="o.payment_status" /></td>
            <td class="px-4 py-3 text-muted">{{ o.placed_at.slice(0, 10) }}</td>
          </tr>
        </tbody>
      </table>
    </UCard>
  </div>
</template>
