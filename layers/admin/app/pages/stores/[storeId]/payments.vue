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
  <div>
    <!-- Contextual back-link only when launched from the onboarding wizard; the
         sidebar handles dashboard navigation otherwise. -->
    <UButton
      v-if="ret"
      :to="backTo" variant="link" color="neutral" size="xs"
      icon="i-lucide-arrow-left" :label="backLabel" class="-ml-2 mb-2"
    />

    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Payments</h1>
        <p class="mt-1 text-sm text-ink-muted">Accept card payments on your storefront via Stripe.</p>
      </div>
    </div>

    <!-- Shared with the onboarding wizard; standalone (no return-path) lands Stripe
         back on this page. -->
    <PaymentsSetup :store-id="storeId" :return-path="ret ?? undefined" class="mt-6" />
  </div>
</template>
