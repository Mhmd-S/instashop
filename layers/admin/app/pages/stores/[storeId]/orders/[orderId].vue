<script setup lang="ts">
import { formatPrice } from '~~/shared/types/product'
import { ORDER_STATUS_TRANSITIONS } from '~~/shared/types/orders'
import { formatCheckoutAnswer, type CheckoutAnswer } from '~~/shared/types/checkout'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

interface OrderDetail {
  order_number: string
  status: string
  payment_status: string
  payment_method: string
  subtotal_minor: number
  total_minor: number
  currency: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  ship_line1: string | null
  ship_line2: string | null
  ship_city: string | null
  ship_region: string | null
  ship_postcode: string | null
  ship_country: string | null
  customer_note: string | null
  custom_fields: CheckoutAnswer[] | null
  stripe_payment_intent_id: string | null
  placed_at: string
}

const route = useRoute()
const storeId = route.params.storeId as string
const orderId = route.params.orderId as string
const { data, refresh } = await useFetch(`/api/admin/stores/${storeId}/orders/${orderId}`)

const order = computed(() => data.value?.order as OrderDetail | undefined)
const customFields = computed(() =>
  (order.value?.custom_fields ?? []).filter((a) => a.type === 'yes_no' || (typeof a.value === 'string' && a.value.trim())),
)
const items = computed(() => data.value?.items ?? [])
const events = computed(() => data.value?.events ?? [])
const nextStatuses = computed(() => {
  const s = order.value?.status as keyof typeof ORDER_STATUS_TRANSITIONS | undefined
  return s ? (ORDER_STATUS_TRANSITIONS[s] ?? []) : []
})

const busy = ref(false)
const error = ref<string | null>(null)
const okMsg = ref<string | null>(null)

// Refund (Stripe orders only). The charge.refunded webhook is the source of truth
// for payment_status, so we just issue the refund and surface a pending message.
const refundOpen = ref(false)
const refundAmount = ref('') // major units; blank = full remaining
const refunding = ref(false)
const canRefund = computed(
  () =>
    !!order.value &&
    order.value.payment_method === 'stripe' &&
    ['paid', 'partially_refunded'].includes(order.value.payment_status),
)

async function transition(status: string) {
  busy.value = true
  error.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}/orders/${orderId}/status`, { method: 'PATCH', body: { status } })
    await refresh()
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Failed'
  } finally {
    busy.value = false
  }
}
async function markPaid() {
  busy.value = true
  error.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}/orders/${orderId}/mark-paid`, { method: 'POST' })
    await refresh()
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Failed'
  } finally {
    busy.value = false
  }
}

async function doRefund() {
  refunding.value = true
  error.value = null
  okMsg.value = null
  try {
    const body: { amountMinor?: number } = {}
    const amt = refundAmount.value.trim()
    if (amt) {
      const n = Number(amt)
      if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a valid amount')
      body.amountMinor = Math.round(n * 100)
    }
    await $fetch(`/api/admin/stores/${storeId}/orders/${orderId}/refund`, { method: 'POST', body })
    refundOpen.value = false
    refundAmount.value = ''
    okMsg.value = 'Refund issued. The payment status updates once Stripe confirms it.'
    await refresh()
  } catch (e) {
    error.value =
      (e as { data?: { statusMessage?: string } }).data?.statusMessage || (e as Error).message || 'Refund failed'
  } finally {
    refunding.value = false
  }
}

function pill(s: string) {
  if (['paid', 'active', 'fulfilled', 'succeeded'].includes(s)) return 'bg-emerald-100 text-emerald-700'
  if (['pending', 'unpaid', 'processing'].includes(s)) return 'bg-amber-100 text-amber-700'
  if (s === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-ink/10 text-ink-muted'
}
</script>

<template>
  <div v-if="order" class="max-w-2xl">
    <UButton :to="`/stores/${storeId}/orders`" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" label="Orders" class="-ml-2 mb-2" />

    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="text-2xl font-bold tracking-tight text-ink">{{ order.order_number }}</h1>
      <div class="flex gap-2">
        <span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize" :class="pill(order.status)">{{ order.status }}</span>
        <span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize" :class="pill(order.payment_status)">{{ order.payment_status }}</span>
      </div>
    </div>

    <!-- actions -->
    <div class="mt-5 flex flex-wrap items-center gap-3">
      <UButton
        v-for="s in nextStatuses" :key="s"
        color="neutral" variant="soft" size="sm" class="capitalize"
        :disabled="busy" :label="`Mark ${s}`"
        @click="transition(s)"
      />
      <UButton
        v-if="order.payment_status === 'unpaid' && order.payment_method === 'cod'"
        color="primary" size="sm" icon="i-lucide-check"
        :disabled="busy" label="Mark paid (COD)"
        @click="markPaid"
      />
      <UButton
        v-if="canRefund"
        color="error" variant="soft" size="sm" icon="i-lucide-rotate-ccw"
        :disabled="busy" label="Refund"
        @click="refundOpen = true"
      />
    </div>
    <UAlert v-if="error" color="error" variant="soft" icon="i-lucide-circle-alert" :title="error" class="mt-3" />
    <UAlert v-if="okMsg" color="success" variant="soft" icon="i-lucide-check" :title="okMsg" class="mt-3" />

    <!-- customer -->
    <div class="mt-8 rounded-xl border border-default bg-white p-5 sm:p-6">
      <div class="grid sm:grid-cols-2 gap-6 text-sm">
        <div>
          <h2 class="font-medium text-ink">Contact</h2>
          <p class="text-ink-muted mt-1">{{ order.contact_name || '—' }}</p>
          <p class="text-ink-muted">{{ order.contact_email || '—' }}</p>
          <p class="text-ink-muted">{{ order.contact_phone || '' }}</p>
        </div>
        <div>
          <h2 class="font-medium text-ink">Shipping</h2>
          <p class="text-ink-muted mt-1">{{ order.ship_line1 || '—' }}</p>
          <p v-if="order.ship_line2" class="text-ink-muted">{{ order.ship_line2 }}</p>
          <p class="text-ink-muted">{{ [order.ship_city, order.ship_region, order.ship_postcode].filter(Boolean).join(', ') }}</p>
          <p class="text-ink-muted">{{ order.ship_country }}</p>
        </div>
      </div>
      <p v-if="order.customer_note" class="mt-4 text-sm text-ink-muted"><span class="font-medium text-ink">Note:</span> {{ order.customer_note }}</p>

      <div v-if="customFields.length" class="mt-4 border-t border-default pt-4">
        <h2 class="font-medium text-ink text-sm">Additional info</h2>
        <dl class="mt-1 space-y-0.5 text-sm">
          <div v-for="a in customFields" :key="a.key" class="flex gap-2">
            <dt class="text-ink">{{ a.label }}:</dt>
            <dd class="text-ink-muted">{{ formatCheckoutAnswer(a) }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- items -->
    <div class="mt-6 rounded-xl border border-default bg-white p-5 sm:p-6">
      <ul class="divide-y divide-default text-sm">
        <li v-for="it in items" :key="it.id" class="py-3 first:pt-0 flex items-center justify-between gap-4">
          <span class="text-ink-muted">{{ it.title_snapshot }} <span class="text-ink-subtle">× {{ it.quantity }}</span></span>
          <span class="text-ink-muted tabular-nums">{{ formatPrice(it.line_total_minor, order.currency) }}</span>
        </li>
      </ul>
      <USeparator class="my-4" />
      <div class="flex items-center justify-between">
        <span class="text-ink-muted">Total</span>
        <span class="text-lg font-semibold tabular-nums text-ink">{{ formatPrice(order.total_minor, order.currency) }}</span>
      </div>
    </div>

    <!-- timeline -->
    <div v-if="events.length" class="mt-6 rounded-xl border border-default bg-white p-5 sm:p-6">
      <h2 class="font-medium text-ink">History</h2>
      <ul class="mt-3 space-y-1 text-sm text-ink-muted">
        <li v-for="ev in events" :key="ev.id">
          {{ ev.created_at.slice(0, 16).replace('T', ' ') }} — {{ ev.kind }}
          <template v-if="ev.from_value || ev.to_value">({{ ev.from_value }} → {{ ev.to_value }})</template>
        </li>
      </ul>
    </div>

    <UModal v-model:open="refundOpen" title="Refund order" :dismissible="!refunding">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-ink-muted">
            Refunds the buyer via Stripe and reverses your commission proportionally. The payment status
            updates when Stripe confirms.
          </p>
          <UFormField label="Amount" help="Leave blank to refund the full remaining amount.">
            <UInput
              v-model="refundAmount" type="number" step="0.01" min="0"
              :placeholder="`Full — up to ${formatPrice(order.total_minor, order.currency)}`"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" label="Cancel" :disabled="refunding" @click="refundOpen = false" />
          <UButton
            color="error" icon="i-lucide-rotate-ccw"
            :label="refunding ? 'Refunding…' : 'Issue refund'"
            :loading="refunding" :disabled="refunding"
            @click="doRefund"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
