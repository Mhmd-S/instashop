export interface CartItem {
  productId: string
  title: string
  unitPriceMinor: number // display-only; the server reprices at checkout (never trusted)
  quantity: number
  imageUrl?: string | null
}

// Cart backed by Nuxt useState (SSR-safe, no external store module). Never
// authoritative — checkout reprices server-side. Persisted to localStorage per
// subdomain by cart-persist.client.ts.
export function useCart() {
  const items = useState<CartItem[]>('cart', () => [])

  function add(item: CartItem) {
    const existing = items.value.find((i) => i.productId === item.productId)
    if (existing) existing.quantity += item.quantity
    else items.value.push({ ...item })
  }
  function setQty(productId: string, quantity: number) {
    const it = items.value.find((i) => i.productId === productId)
    if (!it) return
    if (quantity <= 0) remove(productId)
    else it.quantity = quantity
  }
  function remove(productId: string) {
    items.value = items.value.filter((i) => i.productId !== productId)
  }
  function clear() {
    items.value = []
  }

  // reactive() unwraps the refs so consumers use cart.items / cart.count directly.
  return reactive({
    items,
    count: computed(() => items.value.reduce((n, i) => n + i.quantity, 0)),
    subtotalMinor: computed(() => items.value.reduce((n, i) => n + i.unitPriceMinor * i.quantity, 0)),
    add,
    setQty,
    remove,
    clear,
  })
}
