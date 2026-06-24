<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'
import type { AdminProduct } from '~~/shared/types/product'
import { formatPrice } from '~~/shared/types/product'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
// When opened from the onboarding wizard, return there instead of the dashboard.
// safeReturnPath rejects off-origin values (open-redirect) and array/duplicate params.
const ret = computed(() => safeReturnPath(route.query.return))
const backTo = computed(() => ret.value ?? '/dashboard')
const backLabel = computed(() => (ret.value ? 'Back to setup' : 'Dashboard'))
// Carry the wizard return into drill-in pages so the flow chrome persists there too.
const withReturn = (path: string) => path + (ret.value ? `?return=${encodeURIComponent(ret.value)}` : '')
const { data, refresh } = await useFetch(`/api/admin/stores/${storeId}/products`)
const products = computed(() => data.value?.products ?? [])

async function togglePublish(p: AdminProduct) {
  const status = p.status === 'published' ? 'draft' : 'published'
  await $fetch(`/api/admin/stores/${storeId}/products/${p.id}`, { method: 'PATCH', body: { status } })
  await refresh()
}
async function remove(p: AdminProduct) {
  if (!confirm(`Delete "${p.title}"?`)) return
  await $fetch(`/api/admin/stores/${storeId}/products/${p.id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <SetupFlowBar current="products" />
    <div class="flex items-center justify-between gap-4 mb-8">
      <div>
        <UButton v-if="!ret" :to="backTo" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" :label="backLabel" class="px-0" />
        <h1 class="text-2xl font-bold text-highlighted mt-1">Products</h1>
      </div>
      <UButton :to="withReturn(`/stores/${storeId}/products/new`)" icon="i-lucide-plus" label="New product" />
    </div>

    <div class="mb-6 rounded-xl border border-default p-4">
      <StoreCurrencySelect :store-id="storeId" @changed="() => refresh()" />
    </div>

    <UCard v-if="!products.length">
      <div class="text-center py-12">
        <UIcon name="i-lucide-package" class="size-10 text-dimmed mx-auto" />
        <p class="mt-3 text-muted">No products yet.</p>
        <UButton :to="withReturn(`/stores/${storeId}/products/new`)" icon="i-lucide-plus" label="Add one" class="mt-4" />
      </div>
    </UCard>

    <UCard v-else>
      <table class="w-full text-sm">
        <thead class="text-left text-muted border-b border-default">
          <tr>
            <th class="py-2 font-medium">Product</th>
            <th class="font-medium">Price</th>
            <th class="font-medium">Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id" class="border-b border-default last:border-0">
            <td class="py-3">
              <div class="flex items-center gap-3">
                <img v-if="p.image_url" :src="p.image_url" :alt="p.title" class="w-10 h-10 rounded object-cover border border-default">
                <div v-else class="w-10 h-10 rounded bg-muted border border-default grid place-items-center">
                  <UIcon name="i-lucide-image" class="size-4 text-dimmed" />
                </div>
                <ULink :to="withReturn(`/stores/${storeId}/products/${p.id}`)" class="font-medium text-highlighted hover:text-primary">
                  {{ p.title }}
                </ULink>
                <UBadge v-if="p.needs_review" color="warning" variant="subtle" size="xs" label="Review" />
              </div>
            </td>
            <td class="text-default">{{ formatPrice(p.price_minor, p.currency) }}</td>
            <td>
              <UBadge
                :color="p.status === 'published' ? 'success' : 'neutral'"
                variant="subtle"
                class="capitalize"
                :label="p.status"
              />
            </td>
            <td class="text-right whitespace-nowrap">
              <div class="flex items-center justify-end gap-1">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :icon="p.status === 'published' ? 'i-lucide-eye-off' : 'i-lucide-check'"
                  :label="p.status === 'published' ? 'Unpublish' : 'Publish'"
                  @click="togglePublish(p)"
                />
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" label="Delete" @click="remove(p)" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </UCard>
  </div>
</template>
