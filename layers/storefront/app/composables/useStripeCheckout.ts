import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js'

// Thin client wrapper around Stripe.js Elements for the embedded Payment Element.
// Destination charges are confirmed with the PLATFORM publishable key (no per-store
// account context needed on the client).
export function useStripeCheckout() {
  let stripe: Stripe | null = null
  let elements: StripeElements | null = null

  async function mountPaymentElement(opts: { publishableKey: string; clientSecret: string; el: HTMLElement }) {
    stripe = await loadStripe(opts.publishableKey)
    if (!stripe) throw new Error('Stripe failed to load')
    elements = stripe.elements({ clientSecret: opts.clientSecret })
    elements.create('payment').mount(opts.el)
  }

  // Confirms the payment in-place. `redirect: 'if_required'` keeps the buyer on our
  // page for card payments; methods that need a redirect use return_url.
  async function confirm(returnUrl: string): Promise<{ error?: string }> {
    if (!stripe || !elements) return { error: 'Payment is not ready' }
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    })
    if (error) return { error: error.message || 'Payment failed' }
    return {}
  }

  return { mountPaymentElement, confirm }
}
