// Shared "current store" context for the admin shell. The sidebar, top bar and the
// dashboard all read the same active store so switching in one place updates the rest.
// Priority: the store in the URL (when on a /stores/[id]/… page) → the remembered
// cookie → the first store. The list itself is fetched once and deduped by key.
export function useActiveStore() {
  const { data, refresh } = useFetch('/api/admin/stores', { key: 'admin-stores' })
  const stores = computed(() => data.value?.stores ?? [])

  const route = useRoute()
  const cookie = useCookie<string | null>('insteshop_active_store', { default: () => null })

  const activeId = computed<string | null>(() => {
    const ids = stores.value.map((s) => s.id)
    const fromRoute = route.params.storeId as string | undefined
    if (fromRoute && ids.includes(fromRoute)) return fromRoute
    if (cookie.value && ids.includes(cookie.value)) return cookie.value
    return ids[0] ?? null
  })
  const active = computed(() => stores.value.find((s) => s.id === activeId.value) ?? null)

  // Remember the active store so "Home" (which has no storeId in its URL) reopens it.
  watch(activeId, (id) => {
    if (id) cookie.value = id
  })

  function setActive(id: string) {
    cookie.value = id
  }

  return { stores, activeId, active, setActive, refresh }
}
