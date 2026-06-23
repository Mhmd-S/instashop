// Order/payment state machines (Blueprint §7). Two orthogonal axes.
export const ORDER_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['fulfilled', 'cancelled'],
  fulfilled: ['refunded'],
  cancelled: [],
  refunded: [],
} as const

export const PAYMENT_STATUS_TRANSITIONS = {
  unpaid: ['pending', 'paid'],
  pending: ['paid', 'failed'],
  paid: ['refunded', 'partially_refunded'],
  partially_refunded: ['refunded'],
  refunded: [],
  failed: ['unpaid'],
} as const

export type OrderStatus = keyof typeof ORDER_STATUS_TRANSITIONS
export type PaymentStatus = keyof typeof PAYMENT_STATUS_TRANSITIONS
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled'
// PaymentMethod is defined in shared/types/tenant.ts (single source for auto-import).

export function canTransition<M extends Record<string, readonly string[]>>(
  map: M,
  from: keyof M,
  to: string,
): boolean {
  return (map[from] as readonly string[] | undefined)?.includes(to) ?? false
}
