// Maps the tenant's chosen button style onto Nuxt UI <UButton> props, so the
// store's primary CTAs (Shop all / Add to cart / Checkout) reflect the seller's
// pick. Every other theme dimension is applied via CSS variables; button variant
// can't be, so we set it as a prop instead.
//
//   solid   → filled button (Nuxt UI default)
//   soft    → tinted button
//   outline → bordered button
//   pill    → filled button, fully rounded
//
// Spread onto a CTA with `v-bind`: <UButton color="primary" v-bind="cta" ... />.
type CtaProps = { variant: 'solid' | 'soft' | 'outline'; class?: string }

export function useStoreCta() {
  const { state } = useTenant()
  return computed<CtaProps>(() => {
    switch (state.value.buttonStyle) {
      case 'soft':
        return { variant: 'soft' }
      case 'outline':
        return { variant: 'outline' }
      case 'pill':
        return { variant: 'solid', class: 'rounded-full' }
      default:
        return { variant: 'solid' }
    }
  })
}
