<script setup lang="ts">
import { formatPrice } from '~~/shared/types/product'
import { mergeCheckoutConfig } from '~~/shared/types/checkout'

definePageMeta({ surface: 'store' })

const cart = useCart()
const { store } = useTenant()

// The store owner controls which fields are asked, in what order, and any custom
// questions. mergeCheckoutConfig fills defaults so a never-configured store renders
// the standard form. The server re-validates everything authoritatively.
const checkout = computed(() => mergeCheckoutConfig(store.value?.checkout_config))
const builtinFields = computed(() => checkout.value.fields.filter((f) => f.enabled))
const questions = computed(() => checkout.value.questions)
const fieldRequired = (key: string) => {
  const f = checkout.value.fields.find((x) => x.key === key)
  return !!(f && f.enabled && f.required)
}
const textAnswers = reactive<Record<string, string>>({})
const boolAnswers = reactive<Record<string, boolean>>({})
watchEffect(() => {
  for (const q of questions.value) {
    if (q.type === 'yes_no') {
      if (!(q.key in boolAnswers)) boolAnswers[q.key] = false
    } else if (!(q.key in textAnswers)) {
      textAnswers[q.key] = ''
    }
  }
})
const { mountPaymentElement, confirm } = useStripeCheckout()

const methods = computed<string[]>(() => store.value?.payment_methods ?? ['cod'])
const hasStripe = computed(() => methods.value.includes('stripe'))
const hasCod = computed(() => methods.value.includes('cod'))
const showMethodPicker = computed(() => hasStripe.value && hasCod.value)
const method = ref<'cod' | 'stripe'>('cod')
const methodItems = computed(() => [
  ...(hasStripe.value ? [{ label: 'Pay by card', value: 'stripe' as const, description: 'Secure card payment via Stripe' }] : []),
  ...(hasCod.value ? [{ label: 'Cash on delivery', value: 'cod' as const, description: 'Pay when your order arrives' }] : []),
])

const contact = reactive({ email: '', phone: '', name: '' })
const ship = reactive({ line1: '', line2: '', city: '', region: '', postcode: '', country: '' })
const note = ref('')
const idem = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// Two-step for card: collect details → place order → pay inline.
const stage = ref<'details' | 'pay'>('details')
const placed = ref<{ orderId: string; accessToken: string } | null>(null)
const payEl = ref<HTMLElement | null>(null)
const payAmount = ref(0)
const payCurrency = ref('USD')
const paying = ref(false)

onMounted(() => {
  idem.value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  if (!cart.items.length) navigateTo('/cart')
  method.value = hasStripe.value && !hasCod.value ? 'stripe' : hasCod.value ? 'cod' : 'stripe'
})

async function submitDetails() {
  if (!cart.items.length) return
  loading.value = true
  error.value = null
  try {
    const res = await $fetch('/api/storefront/checkout', {
      method: 'POST',
      body: {
        contact: { email: contact.email, phone: contact.phone || undefined, name: contact.name || undefined },
        ship: {
          name: contact.name || undefined,
          line1: ship.line1 || undefined,
          line2: ship.line2 || undefined,
          city: ship.city || undefined,
          region: ship.region || undefined,
          postcode: ship.postcode || undefined,
          country: ship.country || undefined,
        },
        note: note.value || undefined,
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        idempotencyKey: idem.value,
        paymentMethod: method.value,
        customAnswers: questions.value.map((q) => ({
          key: q.key,
          value: q.type === 'yes_no' ? (boolAnswers[q.key] ?? false) : (textAnswers[q.key] ?? ''),
        })),
      },
    })
    placed.value = { orderId: res.orderId, accessToken: res.accessToken }

    if (method.value === 'cod') {
      cart.clear()
      await navigateTo(`/order/${res.orderId}?token=${res.accessToken}`)
      return
    }

    // Card: create the PaymentIntent and mount the Payment Element.
    const pi = await $fetch('/api/storefront/checkout/payment-intent', {
      method: 'POST',
      body: { orderId: res.orderId, token: res.accessToken },
    })
    if (!pi.clientSecret) throw new Error('Could not start payment')
    payAmount.value = pi.amountMinor
    payCurrency.value = pi.currency
    stage.value = 'pay'
    await nextTick()
    if (payEl.value) {
      await mountPaymentElement({ publishableKey: pi.publishableKey, clientSecret: pi.clientSecret, el: payEl.value })
    }
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = err.data?.statusMessage || err.statusMessage || 'Checkout failed'
  } finally {
    loading.value = false
  }
}

async function pay() {
  if (!placed.value) return
  paying.value = true
  error.value = null
  const returnUrl = `${window.location.origin}/order/${placed.value.orderId}?token=${placed.value.accessToken}`
  const { error: payErr } = await confirm(returnUrl)
  if (payErr) {
    error.value = payErr
    paying.value = false
    return
  }
  // redirect:'if_required' → card succeeded without leaving the page. The webhook
  // flips the order to paid; the confirmation page polls for it.
  cart.clear()
  await navigateTo(`/order/${placed.value.orderId}?token=${placed.value.accessToken}`)
}
</script>

<template>
  <main class="min-h-screen bg-default text-default">
    <StorefrontHeader />

    <UContainer class="max-w-xl py-10">
      <UButton to="/cart" label="Cart" icon="i-lucide-arrow-left" variant="link" color="neutral" size="sm" class="-ms-2.5" />
      <h1 class="text-2xl font-semibold font-heading tracking-tight mt-1 text-highlighted">Checkout</h1>
      <p v-if="stage === 'pay'" class="text-sm text-muted mt-1">Enter your card details to complete the order.</p>
      <p v-else-if="!hasStripe" class="text-sm text-muted mt-1">Cash on delivery — pay when your order arrives.</p>

      <!-- Stage 1: contact + shipping + method -->
      <form v-if="stage === 'details'" class="mt-6 space-y-8" @submit.prevent="submitDetails">
        <fieldset class="space-y-3">
          <legend class="text-sm font-medium mb-2 text-highlighted">Contact</legend>
          <UFormField label="Email" required>
            <UInput v-model="contact.email" type="email" required placeholder="you@example.com" class="w-full" />
          </UFormField>
        </fieldset>

        <!-- Built-in fields the store owner has enabled, in their configured order. -->
        <template v-for="f in builtinFields" :key="f.key">
          <UFormField v-if="f.key === 'name'" label="Name" :required="f.required">
            <UInput v-model="contact.name" type="text" :required="f.required" class="w-full" />
          </UFormField>

          <UFormField v-else-if="f.key === 'phone'" label="Phone" :required="f.required">
            <UInput v-model="contact.phone" type="tel" :required="f.required" class="w-full" />
          </UFormField>

          <fieldset v-else-if="f.key === 'address'" class="space-y-3">
            <legend class="text-sm font-medium mb-2 text-highlighted">
              Shipping address<span v-if="f.required" class="text-error"> *</span>
            </legend>
            <UInput v-model="ship.line1" type="text" placeholder="Address line 1" :required="f.required" class="w-full" />
            <UInput v-model="ship.line2" type="text" placeholder="Address line 2" class="w-full" />
            <div class="grid grid-cols-2 gap-3">
              <UInput v-model="ship.city" type="text" placeholder="City" :required="f.required" class="w-full" />
              <UInput v-model="ship.region" type="text" placeholder="Region/State" class="w-full" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <UInput v-model="ship.postcode" type="text" placeholder="Postcode" class="w-full" />
              <UInput v-model="ship.country" type="text" :maxlength="2" placeholder="Country (US)" class="w-full" :ui="{ base: 'uppercase' }" />
            </div>
          </fieldset>

          <UFormField v-else-if="f.key === 'note'" label="Order note" :required="f.required">
            <UTextarea v-model="note" :rows="2" :required="f.required" class="w-full" />
          </UFormField>
        </template>

        <!-- Custom questions defined by the store owner. -->
        <fieldset v-if="questions.length" class="space-y-4">
          <legend class="text-sm font-medium mb-2 text-highlighted">Additional info</legend>
          <template v-for="q in questions" :key="q.key">
            <UFormField v-if="q.type === 'short_text'" :label="q.label" :required="q.required">
              <UInput v-model="textAnswers[q.key]" type="text" :required="q.required" class="w-full" />
            </UFormField>
            <UFormField v-else-if="q.type === 'long_text'" :label="q.label" :required="q.required">
              <UTextarea v-model="textAnswers[q.key]" :rows="2" :required="q.required" class="w-full" />
            </UFormField>
            <UFormField v-else-if="q.type === 'single_select'" :label="q.label" :required="q.required">
              <USelect v-model="textAnswers[q.key]" :items="q.options ?? []" placeholder="Select…" class="w-full" />
            </UFormField>
            <UCheckbox v-else-if="q.type === 'yes_no'" v-model="boolAnswers[q.key]" :label="q.label" :required="q.required" />
          </template>
        </fieldset>

        <fieldset v-if="showMethodPicker" class="space-y-3">
          <legend class="text-sm font-medium mb-2 text-highlighted">Payment</legend>
          <URadioGroup v-model="method" :items="methodItems" />
        </fieldset>

        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :description="error" />

        <UButton
          type="submit" block size="lg" color="primary"
          :loading="loading" :disabled="loading || !contact.email"
          :label="loading ? 'Working…' : method === 'stripe' ? 'Continue to payment' : 'Place order'"
        />
      </form>

      <!-- Stage 2: embedded Payment Element -->
      <div v-else class="mt-6 space-y-6">
        <div class="flex items-center justify-between">
          <span class="text-muted">Total</span>
          <span class="text-lg font-semibold text-highlighted">{{ formatPrice(payAmount, payCurrency) }}</span>
        </div>

        <div ref="payEl" class="min-h-[6rem]" />

        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :description="error" />

        <UButton
          block size="lg" color="primary"
          :loading="paying" :disabled="paying"
          :label="paying ? 'Processing…' : `Pay ${formatPrice(payAmount, payCurrency)}`"
          @click="pay"
        />
        <p class="text-center text-xs text-muted">Payments are processed securely by Stripe.</p>
      </div>
    </UContainer>
  </main>
</template>
