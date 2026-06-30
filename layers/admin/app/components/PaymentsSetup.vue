<script setup lang="ts">
// Self-contained Stripe Connect setup: connect/onboarding status and the accept-cards
// toggle. Rendered inline in the onboarding wizard and on the standalone Payments page,
// so the flow keeps the same design in both places.
//
// It also owns the Stripe return landing: Account Links bounce the seller back to
// whichever page launched the flow with ?stripe=return (or ?stripe=refresh when a
// link expired), and this component reacts to that marker wherever it's mounted.
const props = defineProps<{
  storeId: string
  // Local path Stripe should return to after onboarding. Omit on the standalone page
  // (the connect endpoint then defaults to it); the wizard passes its step URL so the
  // seller lands back inside the onboarding design.
  returnPath?: string
  // Hides settings-level controls (the accept-cards toggle) when mounted inside the
  // onboarding wizard — connecting Stripe auto-enables cards, so the toggle belongs
  // only on the standalone Payments settings page.
  embedded?: boolean
}>()

// Emitted after the payment state changes (return-sync, toggle) so a parent that
// tracks setup status (the wizard) can refresh its stepper/counters.
const emit = defineEmits<{ changed: [] }>()

const route = useRoute()
const router = useRouter()

// Non-blocking, always-fresh fetch so the component can mount lazily inside the
// wizard without suspending it (mirrors the other inline review components).
const { data, refresh, pending } = useFetch(`/api/admin/stores/${props.storeId}/stripe`, {
  lazy: true,
  getCachedData: () => undefined,
})

const connected = computed(() => !!data.value?.connected)
const account = computed(() => data.value?.account ?? null)
const chargesEnabled = computed(() => !!data.value?.chargesEnabled)
const stripeEnabled = computed(() => !!data.value?.stripeEnabled)
const detailsSubmitted = computed(() => !!account.value?.details_submitted)

const msg = ref<string | null>(null)
const err = ref<string | null>(null)
const busy = ref(false)

onMounted(async () => {
  if (route.query.stripe === 'return') {
    busy.value = true
    try {
      await $fetch(`/api/admin/stores/${props.storeId}/stripe/sync`, { method: 'POST' })
      await refresh()
      msg.value = chargesEnabled.value
        ? 'Stripe connected — you can now accept card payments.'
        : 'Onboarding saved. Stripe still needs a few details before you can accept cards.'
      emit('changed')
    } catch {
      err.value = 'Could not refresh Stripe status. Try again in a moment.'
    } finally {
      busy.value = false
    }
    clearStripeMarker()
  } else if (route.query.stripe === 'refresh') {
    clearStripeMarker()
    await startOnboarding()
  }
})

// Drop the ?stripe marker once handled so a manual refresh doesn't re-trigger it,
// preserving every other query param (the wizard's ?store/?step).
function clearStripeMarker() {
  const query = { ...route.query }
  delete query.stripe
  router.replace({ query })
}

async function startOnboarding() {
  busy.value = true
  err.value = null
  try {
    // Thread the wizard return so Stripe's return/refresh links bring the seller back
    // to wherever they started — keeping the onboarding design across the round-trip.
    const res = await $fetch(`/api/admin/stores/${props.storeId}/stripe/connect`, {
      method: 'POST',
      body: { return: props.returnPath ?? null },
    })
    window.location.href = res.url
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not start Stripe onboarding'
    busy.value = false
  }
}

async function toggleStripe(enable: boolean) {
  err.value = null
  msg.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/payment-methods`, { method: 'PATCH', body: { enableStripe: enable } })
    await refresh()
    msg.value = enable ? 'Card payments are now live on your storefront.' : 'Card payments turned off.'
    emit('changed')
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not update payment methods'
  }
}
</script>

<template>
  <div>
    <UAlert v-if="msg" class="mb-4" color="success" variant="soft" icon="i-lucide-check" :description="msg" />
    <UAlert v-if="err" class="mb-4" color="error" variant="soft" icon="i-lucide-circle-alert" :description="err" />

    <div v-if="pending && !data" class="grid place-items-center rounded-xl border border-default bg-white py-10 text-ink-subtle">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
    </div>

    <!-- Connected -->
    <div v-else-if="connected" class="rounded-xl border border-default bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-credit-card" class="size-10 text-primary" />
        <div>
          <p class="font-medium text-ink">Stripe</p>
          <p class="text-sm text-ink-muted">Card payments via Stripe Connect</p>
        </div>
        <span
          v-if="chargesEnabled"
          class="ml-auto inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700"
        >Ready</span>
        <span
          v-else
          class="ml-auto inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium capitalize text-amber-700"
        >{{ detailsSubmitted ? 'Pending review' : 'Setup incomplete' }}</span>
      </div>

      <UAlert
        v-if="!chargesEnabled" class="mt-4" color="warning" variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Finish Stripe onboarding"
        :description="detailsSubmitted
          ? 'Stripe is verifying your details. Card payments unlock once it confirms — check back shortly.'
          : 'A few details are still needed before you can accept cards.'"
      />

      <!-- Capability checklist -->
      <dl class="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div class="rounded-lg border border-default py-3">
          <UIcon
            :name="detailsSubmitted ? 'i-lucide-check-circle-2' : 'i-lucide-circle-dashed'"
            class="size-5 mx-auto"
            :class="detailsSubmitted ? 'text-success' : 'text-ink-subtle'"
          />
          <dt class="text-ink-muted mt-1">Details</dt>
        </div>
        <div class="rounded-lg border border-default py-3">
          <UIcon
            :name="chargesEnabled ? 'i-lucide-check-circle-2' : 'i-lucide-circle-dashed'"
            class="size-5 mx-auto"
            :class="chargesEnabled ? 'text-success' : 'text-ink-subtle'"
          />
          <dt class="text-ink-muted mt-1">Charges</dt>
        </div>
        <div class="rounded-lg border border-default py-3">
          <UIcon
            :name="account?.payouts_enabled ? 'i-lucide-check-circle-2' : 'i-lucide-circle-dashed'"
            class="size-5 mx-auto"
            :class="account?.payouts_enabled ? 'text-success' : 'text-ink-subtle'"
          />
          <dt class="text-ink-muted mt-1">Payouts</dt>
        </div>
      </dl>

      <div v-if="!chargesEnabled" class="mt-4">
        <UButton
          :loading="busy" :disabled="busy" icon="i-lucide-external-link" color="primary"
          label="Continue Stripe onboarding" @click="startOnboarding"
        />
      </div>

      <!-- Accept cards toggle (only meaningful once charges are enabled). Hidden in the
           onboarding wizard (embedded): connecting Stripe auto-enables cards there. -->
      <div v-else-if="!embedded" class="mt-5 flex items-center justify-between gap-4 rounded-lg border border-default p-4">
        <div>
          <p class="font-medium text-ink">Accept card payments</p>
          <p class="text-sm text-ink-muted">Show Stripe at checkout on your storefront.</p>
        </div>
        <USwitch :model-value="stripeEnabled" @update:model-value="toggleStripe" />
      </div>
    </div>

    <!-- Not connected yet -->
    <div v-else class="rounded-xl border border-default bg-white p-5 sm:p-6">
      <p class="text-ink-muted text-sm">
        Accept card payments with <strong class="text-ink">Stripe</strong>. Money goes straight to
        your own Stripe account; payouts, refunds, and receipts are yours. Set-up takes a couple of minutes.
      </p>
      <UButton
        :loading="busy" :disabled="busy" class="mt-4 shadow-card" icon="i-lucide-credit-card" color="primary"
        label="Connect Stripe" @click="startOnboarding"
      />
    </div>
  </div>
</template>
