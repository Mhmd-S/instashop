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
const { data, refresh } = await useFetch(`/api/admin/stores/${storeId}/stripe`)

const connected = computed(() => !!data.value?.connected)
const account = computed(() => data.value?.account ?? null)
const chargesEnabled = computed(() => !!data.value?.chargesEnabled)
const stripeEnabled = computed(() => !!data.value?.stripeEnabled)
const detailsSubmitted = computed(() => !!account.value?.details_submitted)

const msg = ref<string | null>(null)
const err = ref<string | null>(null)
const busy = ref(false)

const feeBps = ref<number | null>(account.value?.platform_fee_bps ?? null)
watch(account, (a) => { feeBps.value = a?.platform_fee_bps ?? null })

onMounted(async () => {
  if (route.query.stripe === 'return') {
    busy.value = true
    try {
      await $fetch(`/api/admin/stores/${storeId}/stripe/sync`, { method: 'POST' })
      await refresh()
      msg.value = chargesEnabled.value
        ? 'Stripe connected — you can now accept card payments.'
        : 'Onboarding saved. Stripe still needs a few details before you can accept cards.'
    } catch {
      err.value = 'Could not refresh Stripe status. Try again in a moment.'
    } finally {
      busy.value = false
    }
  } else if (route.query.stripe === 'refresh') {
    await startOnboarding()
  }
})

async function startOnboarding() {
  busy.value = true
  err.value = null
  try {
    // Pass the wizard return so Stripe's return/refresh links bring it back here.
    const res = await $fetch(`/api/admin/stores/${storeId}/stripe/connect`, {
      method: 'POST',
      body: { return: ret.value },
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
    await $fetch(`/api/admin/stores/${storeId}/payment-methods`, { method: 'PATCH', body: { enableStripe: enable } })
    await refresh()
    msg.value = enable ? 'Card payments are now live on your storefront.' : 'Card payments turned off.'
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not update payment methods'
  }
}

async function saveFee() {
  err.value = null
  msg.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}/payment-methods`, { method: 'PATCH', body: { platformFeeBps: feeBps.value } })
    await refresh()
    msg.value = 'Commission updated.'
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not update commission'
  }
}
</script>

<template>
  <UContainer class="max-w-2xl py-2">
    <SetupFlowBar current="payments" />
    <UButton
      v-if="!ret"
      :to="backTo" icon="i-lucide-arrow-left" :label="backLabel"
      variant="link" color="neutral" size="sm" class="-ml-2.5"
    />
    <h1 class="text-2xl font-bold text-highlighted mt-1">Payments</h1>

    <UAlert v-if="msg" class="mt-4" color="success" variant="soft" icon="i-lucide-check" :description="msg" />
    <UAlert v-if="err" class="mt-4" color="error" variant="soft" icon="i-lucide-circle-alert" :description="err" />

    <!-- Connected -->
    <UCard v-if="connected" class="mt-6">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-credit-card" class="size-10 text-primary" />
        <div>
          <p class="font-medium text-highlighted">Stripe</p>
          <p class="text-sm text-muted">Card payments via Stripe Connect</p>
        </div>
        <UBadge
          v-if="chargesEnabled" class="ml-auto" color="success" variant="subtle" label="Ready"
        />
        <UBadge
          v-else class="ml-auto" color="warning" variant="subtle"
          :label="detailsSubmitted ? 'Pending review' : 'Setup incomplete'"
        />
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
            :class="detailsSubmitted ? 'text-success' : 'text-dimmed'"
          />
          <dt class="text-muted mt-1">Details</dt>
        </div>
        <div class="rounded-lg border border-default py-3">
          <UIcon
            :name="chargesEnabled ? 'i-lucide-check-circle-2' : 'i-lucide-circle-dashed'"
            class="size-5 mx-auto"
            :class="chargesEnabled ? 'text-success' : 'text-dimmed'"
          />
          <dt class="text-muted mt-1">Charges</dt>
        </div>
        <div class="rounded-lg border border-default py-3">
          <UIcon
            :name="account?.payouts_enabled ? 'i-lucide-check-circle-2' : 'i-lucide-circle-dashed'"
            class="size-5 mx-auto"
            :class="account?.payouts_enabled ? 'text-success' : 'text-dimmed'"
          />
          <dt class="text-muted mt-1">Payouts</dt>
        </div>
      </dl>

      <div v-if="!chargesEnabled" class="mt-4">
        <UButton
          :loading="busy" :disabled="busy" icon="i-lucide-external-link" color="primary"
          label="Continue Stripe onboarding" @click="startOnboarding"
        />
      </div>

      <!-- Accept cards toggle (only meaningful once charges are enabled) -->
      <div v-else class="mt-5 flex items-center justify-between gap-4 rounded-lg border border-default p-4">
        <div>
          <p class="font-medium text-highlighted">Accept card payments</p>
          <p class="text-sm text-muted">Show Stripe at checkout on your storefront.</p>
        </div>
        <USwitch :model-value="stripeEnabled" @update:model-value="toggleStripe" />
      </div>

      <!-- Commission override -->
      <div class="mt-4 rounded-lg border border-default p-4">
        <p class="font-medium text-highlighted">Platform commission</p>
        <p class="text-sm text-muted">Basis points taken per sale. Leave blank for the platform default. 150 = 1.5%.</p>
        <div class="mt-3 flex items-center gap-2">
          <UInput
            v-model.number="feeBps" type="number" :min="0" :max="10000"
            placeholder="default" class="w-40" trailing-icon="i-lucide-percent"
          />
          <UButton color="neutral" variant="soft" label="Save" icon="i-lucide-save" @click="saveFee" />
        </div>
      </div>
    </UCard>

    <!-- Not connected yet -->
    <UCard v-else class="mt-6">
      <p class="text-muted text-sm">
        Accept card payments with <strong class="text-highlighted">Stripe</strong>. Money goes straight to
        your own Stripe account; payouts, refunds, and receipts are yours. Set-up takes a couple of minutes.
      </p>
      <UButton
        :loading="busy" :disabled="busy" class="mt-4" icon="i-lucide-credit-card" color="primary"
        label="Connect Stripe" @click="startOnboarding"
      />
    </UCard>
  </UContainer>
</template>
