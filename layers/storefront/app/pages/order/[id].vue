<script setup lang="ts">
import { formatPrice } from '~~/shared/types/product'
import { formatCheckoutAnswer, type CheckoutAnswer } from '~~/shared/types/checkout'

definePageMeta({ surface: 'store' })

const route = useRoute()
const token = route.query.token as string | undefined
if (!token) throw createError({ statusCode: 400, statusMessage: 'Missing order token', fatal: true })

const { data, refresh } = await useFetch(`/api/storefront/orders/${route.params.id}`, { query: { token } })
if (!data.value?.order) throw createError({ statusCode: 404, statusMessage: 'Order not found', fatal: true })

interface OrderShape {
  order_number: string
  status: string
  payment_status: string
  payment_method: string
  total_minor: number
  currency: string
  items: Array<{ id: string; title_snapshot: string; quantity: number; line_total_minor: number }>
  custom_fields: CheckoutAnswer[] | null
}
const order = computed(() => data.value!.order as OrderShape)
const items = computed(() => order.value.items ?? [])
const customFields = computed(() =>
  (order.value.custom_fields ?? []).filter((a) => a.type === 'yes_no' || (typeof a.value === 'string' && a.value.trim())),
)

// Card orders land as 'pending' and flip to 'paid' when the Stripe webhook confirms.
// Poll briefly so the buyer sees the final state without a manual refresh.
const awaitingPayment = computed(() => order.value.payment_method === 'stripe' && order.value.payment_status === 'pending')
onMounted(() => {
  if (!awaitingPayment.value) return
  let tries = 0
  const timer = setInterval(async () => {
    tries++
    await refresh()
    if (!awaitingPayment.value || tries >= 12) clearInterval(timer)
  }, 2000)
})

const paid = computed(() => order.value.payment_status === 'paid')
const failed = computed(() => order.value.payment_status === 'failed')
</script>

<template>
  <main class="min-h-screen bg-default text-default">
    <StorefrontHeader />

    <UContainer class="max-w-2xl py-10">
      <UCard>
        <div class="text-center">
          <UIcon
            :name="failed ? 'i-lucide-circle-alert' : awaitingPayment ? 'i-lucide-loader-circle' : 'i-lucide-circle-check-big'"
            class="mx-auto size-10"
            :class="[failed ? 'text-error' : 'text-primary', awaitingPayment ? 'animate-spin' : '']"
          />
          <h1 class="font-heading mt-3 text-2xl font-semibold tracking-tight text-highlighted">
            {{ failed ? 'Payment failed' : awaitingPayment ? 'Confirming payment…' : 'Thank you!' }}
          </h1>
          <p class="mt-1 text-muted">
            Order <strong class="text-highlighted">{{ order.order_number }}</strong>
            {{ failed ? 'could not be paid.' : 'placed.' }}
          </p>
          <div class="mt-3 flex items-center justify-center gap-2">
            <UBadge :label="order.status" color="neutral" variant="subtle" />
            <UBadge
              :label="`Payment: ${order.payment_status}`"
              :color="paid ? 'success' : failed ? 'error' : 'primary'"
              variant="subtle"
            />
          </div>
        </div>
      </UCard>

      <UCard class="mt-6">
        <ul class="divide-y divide-default">
          <li v-for="it in items" :key="it.id" class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <span class="text-default">
              {{ it.title_snapshot }}
              <span class="text-muted">× {{ it.quantity }}</span>
            </span>
            <span class="text-muted">{{ formatPrice(it.line_total_minor, order.currency) }}</span>
          </li>
        </ul>

        <USeparator class="my-4" />

        <div class="flex items-center justify-between">
          <span class="text-muted">Total</span>
          <span class="text-lg font-semibold text-highlighted">{{ formatPrice(order.total_minor, order.currency) }}</span>
        </div>
      </UCard>

      <UCard v-if="customFields.length" class="mt-6">
        <dl class="space-y-2 text-sm">
          <div v-for="a in customFields" :key="a.key" class="flex justify-between gap-4">
            <dt class="text-muted">{{ a.label }}</dt>
            <dd class="text-default text-right">{{ formatCheckoutAnswer(a) }}</dd>
          </div>
        </dl>
      </UCard>

      <UButton
        to="/"
        label="Continue shopping"
        trailing-icon="i-lucide-arrow-right"
        variant="link"
        color="neutral"
        block
        class="mt-8"
      />
    </UContainer>
  </main>
</template>
