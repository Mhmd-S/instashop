import type { DesignTokens } from '~~/shared/types/theme'
import type { HostInfo, ResolvedStore, StoreLogo, Surface } from '~~/shared/types/tenant'

declare module 'h3' {
  interface H3EventContext {
    surface?: Surface
    store?: ResolvedStore | null
    hostInfo?: HostInfo | null
    themeTokens?: DesignTokens | null
    themeLogo?: StoreLogo | null
  }
}

export {}
