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
  <div class="max-w-4xl">
    <SetupFlowBar current="branding" />
    <UButton v-if="!ret" :to="backTo" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" :label="backLabel" class="px-0" />
    <h1 class="text-2xl font-bold text-highlighted mt-1 mb-1">Branding posts</h1>
    <p class="text-muted text-sm mb-6">
      Non-product Instagram posts captured during import (lifestyle, announcements). Pick one as your storefront hero banner.
    </p>
    <BrandingReview :store-id="storeId" />
  </div>
</template>
