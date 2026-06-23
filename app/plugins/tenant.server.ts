import type { ResolvedStore, StoreLogo, TenantState } from '~~/shared/types/tenant'

// Hydrates the tenant resolved by server/middleware/00.tenant.ts into useState,
// so the client renders the same surface/store after hydration (no extra fetch).
export default defineNuxtPlugin(() => {
  const event = useRequestEvent()
  const ctx = event?.context
  const state = useState<TenantState>('tenant', () => ({
    surface: 'marketing',
    store: null,
    hostInfo: null,
    logo: null,
  }))
  state.value = {
    surface: ctx?.surface ?? 'marketing',
    store: (ctx?.store as ResolvedStore | null) ?? null,
    hostInfo: ctx?.hostInfo ?? null,
    logo: (ctx?.themeLogo as StoreLogo | null) ?? null,
  }
})
