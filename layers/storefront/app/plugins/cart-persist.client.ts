// Persist the cart to localStorage, scoped per store subdomain (insteshop:cart:<sub>).
// Client-only so SSR never touches it (the cart is never authoritative).
export default defineNuxtPlugin(() => {
  const cart = useCart()
  const { store } = useTenant()
  const key = `insteshop:cart:${store.value?.subdomain ?? 'default'}`

  try {
    const raw = localStorage.getItem(key)
    if (raw) cart.items = JSON.parse(raw)
  } catch { /* ignore corrupt cart */ }

  watch(
    () => cart.items,
    (val) => {
      try {
        localStorage.setItem(key, JSON.stringify(val))
      } catch { /* quota/private mode — ignore */ }
    },
    { deep: true },
  )
})
