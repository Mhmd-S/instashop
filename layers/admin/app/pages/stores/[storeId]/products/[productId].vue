<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
const productId = route.params.productId as string
// Preserve onboarding-wizard context when drilled in from the products step.
const ret = computed(() => safeReturnPath(route.query.return))
const retQs = computed(() => (ret.value ? `?return=${encodeURIComponent(ret.value)}` : ''))

function onDeleted() {
  navigateTo(`/stores/${storeId}/products${retQs.value}`)
}
</script>

<template>
  <div class="max-w-2xl">
    <SetupFlowBar current="products" />
    <UButton :to="`/stores/${storeId}/products${retQs}`" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" label="Products" class="px-0" />
    <h1 class="text-2xl font-bold text-highlighted mt-1 mb-6">Edit product</h1>
    <ProductEditor :store-id="storeId" :product-id="productId" @deleted="onDeleted" />
  </div>
</template>
