import type { TenantState } from '~~/shared/types/tenant'

// Reads the tenant hydrated by app/plugins/tenant.server.ts.
export function useTenant() {
  const state = useState<TenantState>('tenant', () => ({
    surface: 'marketing',
    store: null,
    hostInfo: null,
    logo: null,
  }))
  return {
    state,
    surface: computed(() => state.value.surface),
    store: computed(() => state.value.store),
    hostInfo: computed(() => state.value.hostInfo),
    logo: computed(() => state.value.logo),
  }
}
