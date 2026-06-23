import Stripe from 'stripe'
import type { H3Event } from 'h3'

let _stripe: Stripe | null = null

// The single platform Stripe client (server-only). Connect destination charges run
// on the platform account, so this one secret key serves every tenant — we never
// hold a per-store key. 503s if Stripe isn't configured.
export function stripe(event: H3Event): Stripe {
  const cfg = useRuntimeConfig(event)
  if (!cfg.stripeSecretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Stripe is not configured (set NUXT_STRIPE_SECRET_KEY)' })
  }
  if (!_stripe) _stripe = new Stripe(cfg.stripeSecretKey)
  return _stripe
}

// Effective application-fee rate in basis points: the per-store override if set,
// else the platform default from runtimeConfig (NUXT_PLATFORM_FEE_BPS).
export function effectiveFeeBps(event: H3Event, perStoreBps: number | null | undefined): number {
  if (perStoreBps != null) return perStoreBps
  const dflt = Number(useRuntimeConfig(event).platformFeeBps || 0)
  return Number.isFinite(dflt) && dflt > 0 ? dflt : 0
}

// The commission to deduct from a destination charge, in minor units (cents).
export function applicationFeeAmount(totalMinor: number, bps: number): number {
  if (!bps || bps <= 0) return 0
  return Math.floor((totalMinor * bps) / 10000)
}
