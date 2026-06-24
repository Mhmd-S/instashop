<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
// When opened from the onboarding wizard, return there instead of the dashboard.
// safeReturnPath rejects off-origin values (open-redirect) and array/duplicate params.
const ret = computed(() => safeReturnPath(route.query.return))
const backTo = computed(() => ret.value ?? '/dashboard')
const backLabel = computed(() => (ret.value ? 'Back to setup' : 'Dashboard'))
</script>

<template>
  <div class="max-w-3xl">
    <SetupFlowBar current="products" />
    <UButton v-if="!ret" :to="backTo" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" :label="backLabel" class="px-0" />
    <h1 class="text-2xl font-bold text-highlighted mt-1">Categories</h1>
    <p class="text-muted text-sm mt-1 mb-6">Group products into collections shoppers can browse.</p>

    <UCard>
      <CategoryManager :store-id="storeId" :with-header="false" />
    </UCard>
  </div>
</template>
