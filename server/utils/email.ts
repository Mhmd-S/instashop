import { Resend } from 'resend'
import { formatCheckoutAnswer, type CheckoutAnswer } from '~~/shared/types/checkout'

// Escape buyer-controlled text before interpolating into the email HTML.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Light new-order notification. No-op if RESEND is not configured (dev default).
export async function notifyNewOrder(opts: {
  to: string | null | undefined
  storeName: string
  orderNumber: string
  totalMinor: number
  currency: string
  customAnswers?: CheckoutAnswer[]
}) {
  const cfg = useRuntimeConfig()
  if (!cfg.resendApiKey || !opts.to) return
  try {
    const resend = new Resend(cfg.resendApiKey)
    const total = (opts.totalMinor / 100).toFixed(2)
    const answers = (opts.customAnswers ?? []).filter(
      (a) => a.type === 'yes_no' || (typeof a.value === 'string' && a.value.trim().length > 0),
    )
    const answersHtml = answers.length
      ? `<ul>${answers
          .map((a) => `<li><strong>${escapeHtml(a.label)}:</strong> ${escapeHtml(formatCheckoutAnswer(a))}</li>`)
          .join('')}</ul>`
      : ''
    await resend.emails.send({
      from: cfg.resendFrom || 'Chanis <orders@chanis.app>',
      to: opts.to,
      subject: `New order ${opts.orderNumber} — ${opts.storeName}`,
      html: `<p>You have a new order <strong>${escapeHtml(opts.orderNumber)}</strong> totalling ${total} ${escapeHtml(opts.currency)}.</p>${answersHtml}`,
    })
  } catch (e) {
    console.error('[email] notifyNewOrder failed', e)
  }
}
