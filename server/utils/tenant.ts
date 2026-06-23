import type { H3Event } from 'h3'
import { getRequestHost } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { RESERVED_SUBDOMAINS } from '~~/shared/tenancy/reserved'
import type { HostInfo, ResolvedStore } from '~~/shared/types/tenant'

// H1: ONE host parser. xForwardedHost is hard-locked to false — never trust a
// client-supplied X-Forwarded-Host, or store A could spoof store B's tenant.
export function parseHost(event: H3Event): HostInfo {
  const base = (useRuntimeConfig(event).public.appBaseDomain || 'lvh.me')
    .split(':')[0]
    .toLowerCase()
  const raw = (getRequestHost(event, { xForwardedHost: false }) ?? '').toLowerCase()
  const host = raw.split(':')[0]

  if (!host) return { host, subdomain: null, kind: 'foreign' }
  if (host === base || host === `www.${base}`) return { host, subdomain: null, kind: 'apex' }

  const suffix = `.${base}`
  if (!host.endsWith(suffix)) return { host, subdomain: null, kind: 'foreign' }

  const label = host.slice(0, -suffix.length)
  // L3: reject nested labels (a.b.base) — no sub-sub-domains.
  if (!label || label.includes('.')) return { host, subdomain: label || null, kind: 'foreign' }

  return {
    host,
    subdomain: label,
    kind: RESERVED_SUBDOMAINS.has(label) ? 'reserved' : 'store',
  }
}

const STORE_FIELDS =
  'id, subdomain, name, status, base_currency, active_theme_id, track_inventory, default_country, payment_methods, checkout_config'

// The single legitimate service-role read of the global store registry, keyed on
// the UNIQUE subdomain. Cached (60s) + negative-cached (30s) in Nitro storage (L3).
// Resilient: if the DB is unreachable (e.g. local Supabase not started yet) we
// treat it as "not found" so marketing/admin surfaces keep working.
export async function lookupStoreBySubdomain(
  event: H3Event,
  subdomain: string,
): Promise<ResolvedStore | null> {
  const cache = useStorage('tenant')
  const key = `store:${subdomain}`
  const cached = await cache.getItem<ResolvedStore | { __miss: true }>(key)
  if (cached) return '__miss' in cached ? null : (cached as ResolvedStore)

  try {
    const db = serverSupabaseServiceRole(event)
    const { data, error } = await db
      .from('stores')
      .select(STORE_FIELDS)
      .eq('subdomain', subdomain)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      await cache.setItem(key, { __miss: true }, { ttl: 30 })
      return null
    }
    await cache.setItem(key, data as unknown as ResolvedStore, { ttl: 60 })
    return data as unknown as ResolvedStore
  } catch (err) {
    console.error('[tenant] store lookup failed for', subdomain, '-', (err as Error)?.message)
    return null
  }
}

// Drop the cached store row for a subdomain so the next request re-reads it. Call
// after mutating a STORE_FIELDS column (e.g. payment_methods) that the storefront
// reads from event.context.store — otherwise the change is invisible for up to 60s.
export async function bustStoreCache(subdomain: string): Promise<void> {
  await useStorage('tenant').removeItem(`store:${subdomain}`)
}
