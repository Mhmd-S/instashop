<script setup lang="ts">
const { store } = useTenant()
const cart = useCart()
const route = useRoute()
const { data: catData } = await useFetch('/api/storefront/categories')
const categories = computed(() => catData.value?.categories ?? [])

const onHome = computed(() => route.path === '/')
function isActive(slug: string) {
  return route.path === `/categories/${slug}`
}
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-(--t-rule) bg-(--ui-bg)/80 backdrop-blur supports-[backdrop-filter]:bg-(--ui-bg)/70">
    <UContainer class="flex h-[4.25rem] items-center justify-between gap-6">
      <ULink to="/" class="min-w-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-(--ui-text)" :aria-label="store?.name ?? 'Store'">
        <StorefrontBrand />
      </ULink>
      <ULink
        to="/cart"
        class="group shrink-0 text-[0.78rem] font-medium uppercase tracking-[0.18em] text-highlighted focus:outline-none focus-visible:ring-1 focus-visible:ring-(--ui-text)"
      >
        Bag<ClientOnly><span v-if="cart.count" class="text-muted"> ({{ cart.count }})</span></ClientOnly>
      </ULink>
    </UContainer>

    <nav v-if="categories.length" class="border-t border-(--t-rule)">
      <UContainer
        class="flex items-center gap-7 overflow-x-auto py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.18em] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ULink
          to="/"
          class="shrink-0 border-b border-transparent pb-0.5 transition-colors"
          :class="onHome ? 'border-(--ui-text) text-highlighted' : 'text-muted hover:text-highlighted'"
        >All</ULink>
        <ULink
          v-for="c in categories"
          :key="c.slug"
          :to="`/categories/${c.slug}`"
          class="shrink-0 whitespace-nowrap border-b border-transparent pb-0.5 transition-colors"
          :class="isActive(c.slug) ? 'border-(--ui-text) text-highlighted' : 'text-muted hover:text-highlighted'"
        >{{ c.name }}</ULink>
      </UContainer>
    </nav>
  </header>
</template>
