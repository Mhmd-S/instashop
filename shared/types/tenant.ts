import type { CheckoutConfig } from './checkout'

export type Surface = 'marketing' | 'admin' | 'store'

export interface HostInfo {
  host: string
  subdomain: string | null
  kind: 'apex' | 'reserved' | 'store' | 'foreign'
}

export type StoreStatus = 'pending' | 'active' | 'suspended' | 'archived'
export type PaymentMethod = 'cod' | 'stripe'

// The shape attached to event.context.store and hydrated into the client (useTenant()).
export interface ResolvedStore {
  id: string
  subdomain: string
  name: string
  status: StoreStatus
  base_currency: string
  active_theme_id: string | null
  track_inventory: boolean
  default_country: string | null
  payment_methods: PaymentMethod[]
  // Raw stored config (may be {} / partial); normalize with mergeCheckoutConfig().
  checkout_config: CheckoutConfig | null
}

// The store's brand logo, resolved from the active theme. `transparent` = the logo
// art has a transparent background (render it as a bare mark); otherwise it's an
// avatar-style image (e.g. an IG profile picture) better shown in a rounded frame.
export interface StoreLogo {
  url: string
  transparent: boolean
}

export interface TenantState {
  surface: Surface
  store: ResolvedStore | null
  hostInfo: HostInfo | null
  logo: StoreLogo | null
}
