<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'
import { onboardingStepUrl } from '~~/shared/onboarding/steps'
import type { OnboardingStepKey, SetupStatus } from '~~/shared/onboarding/steps'

// Wizard chrome for the deep-linked setup pages: when a page is opened from the
// onboarding flow (a valid ?return is present) this renders the same stepper plus a
// "Back to setup" link, so Instagram/theme/products/branding/payments feel like part
// of the flow rather than standalone pages. Renders nothing when visited directly.
const props = defineProps<{ current: OnboardingStepKey }>()

const route = useRoute()
const storeId = computed(() => route.params.storeId as string)
const ret = computed(() => safeReturnPath(route.query.return))
const backTo = computed(() => ret.value ?? onboardingStepUrl(storeId.value, props.current))

// Live step status so the stepper shows real checkmarks (matches the wizard). Only
// fetched when actually in the flow.
const { data: status } = useLazyFetch<SetupStatus>(
  () => `/api/admin/stores/${storeId.value}/setup-status`,
  { immediate: !!ret.value, watch: false, getCachedData: () => undefined },
)
</script>

<template>
  <div v-if="ret" class="mb-6 rounded-xl border border-default bg-elevated/40 p-3 sm:p-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <UButton :to="backTo" icon="i-lucide-arrow-left" label="Back to setup" variant="link" color="neutral" size="sm" class="-ml-1.5" />
      <span class="text-[11px] font-medium uppercase tracking-wide text-dimmed">Store setup</span>
    </div>
    <OnboardingStepper :current="current" :store-id="storeId" :status="status" />
  </div>
</template>
