import type { CheckoutConfig } from './checkout'
import type { DesignTokens } from './theme'

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
  // Button style from the active theme — drives the look of the store's primary
  // CTAs (everything else theme-related is applied via CSS variables). Null when
  // the store has no active theme or off the storefront surface.
  buttonStyle: DesignTokens['buttonStyle'] | null
  // The active theme's mood tags (up to 4, e.g. ['luxury','elegant']). Unlike the
  // palette/font tokens — which apply purely via CSS variables — mood shapes layout
  // emphasis & rhythm, so the storefront needs it in JS (see useStoreMood). Null
  // when the store has no active theme or off the storefront surface.
  mood: DesignTokens['mood'] | null
  // The active theme's structural art direction (layout archetype + hero/card/section
  // composition). Like mood, it can't be expressed as a CSS var — it selects which
  // layout primitives render — so the storefront needs it in JS (see
  // useStoreArtDirection). Null when no active theme / off the storefront surface.
  artDirection: DesignTokens['artDirection'] | null
}
