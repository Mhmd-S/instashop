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
  <UContainer class="max-w-3xl py-2">
    <SetupFlowBar current="theme" />
    <UButton v-if="!ret" :to="backTo" icon="i-lucide-arrow-left" :label="backLabel" variant="link" color="neutral" size="sm" class="-ml-2.5" />
    <h1 class="text-2xl font-bold text-highlighted mt-1 mb-6">Theme</h1>
    <ThemeEditor :store-id="storeId" />
  </UContainer>
</template>
