import type { CategoryWithCount } from '~~/shared/types/category'

// Stable per-store key for the shared list, so non-consumers (e.g. a product list
// that just needs to invalidate counts) can refresh it via refreshNuxtData() without
// instantiating a second useFetch on the same key.
export function storeCategoriesKey(storeId: string) {
  return `store-categories:${storeId}`
}

// Shared store-categories list, keyed stably per store so every consumer reads the
// same data: the manager panel and each product's assign dropdown. A create /
// rename / delete `refresh()` in one place therefore reflects everywhere at once,
// with no remount. Always hits the network (getCachedData) so edits never show a
// stale list.
export function useStoreCategories(storeId: MaybeRefOrGetter<string>) {
  return useFetch<{ categories: CategoryWithCount[] }>(
    () => `/api/admin/stores/${toValue(storeId)}/categories`,
    {
      key: storeCategoriesKey(toValue(storeId)),
      lazy: true,
      getCachedData: () => undefined,
      default: () => ({ categories: [] }),
    },
  )
}
