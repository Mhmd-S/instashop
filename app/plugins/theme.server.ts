import type { DesignTokens } from '~~/shared/types/theme'
import type { StoreLogo } from '~~/shared/types/tenant'
import { googleFontLinks, tokensToCssVars } from '~~/shared/theme/cssVars'

// Injects the resolved tenant's theme by overriding Nuxt UI's --ui-* design tokens
// during SSR (no FOUC). ONLY on the storefront — admin + marketing keep Nuxt UI's
// default theme. Stores with no active theme fall back to the Nuxt UI default too.
export default defineNuxtPlugin(() => {
  const event = useRequestEvent()
  const ctx = event?.context
  if (ctx?.surface !== 'store') return

  const tokens = ctx.themeTokens as DesignTokens | null | undefined
  if (!tokens) return

  // The brand logo doubles as the storefront favicon (on-brand browser tab), in
  // addition to being rendered in the header/hero. `key` lets it override the
  // default favicon link rather than appending a second one.
  const logo = ctx.themeLogo as StoreLogo | null | undefined

  useHead({
    style: [{ innerHTML: tokensToCssVars(tokens), id: 'tenant-theme' }],
    link: [
      ...googleFontLinks(tokens.typography.heading, tokens.typography.body),
      ...(logo?.url ? [{ rel: 'icon', href: logo.url, key: 'favicon' }] : []),
    ],
  })
})
