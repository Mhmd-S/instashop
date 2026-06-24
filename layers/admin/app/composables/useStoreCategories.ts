import type { CategoryWithCount } from '~~/shared/types/category'

// Shared store-categories list, keyed stably per store so every consumer reads the
// same data: the manager panel and each product's assign dropdown. A create /
// rename / delete `refresh()` in one place therefore reflects everywhere at once,
// with no remount. Always hits the network (getCachedData) so edits never show a
// stale list.
export function useStoreCategories(storeId: MaybeRefOrGetter<string>) {
  return useFetch<{ categories: CategoryWithCount[] }>(
    () => `/api/admin/stores/${toValue(storeId)}/categories`,
    {
      key: `store-categories:${toValue(storeId)}`,
      lazy: true,
      getCachedData: () => undefined,
      default: () => ({ categories: [] }),
    },
  )
}
