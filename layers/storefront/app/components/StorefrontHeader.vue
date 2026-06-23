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
  <header class="sticky top-0 z-20 border-b border-default bg-default/85 backdrop-blur supports-[backdrop-filter]:bg-default/75">
    <UContainer class="flex h-16 items-center justify-between gap-4">
      <ULink to="/" class="min-w-0 rounded-[var(--ui-radius)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" :aria-label="store?.name ?? 'Store'">
        <StorefrontBrand />
      </ULink>
      <UButton to="/cart" icon="i-lucide-shopping-cart" color="neutral" variant="ghost" aria-label="Cart">
        <span class="hidden sm:inline">Cart</span>
        <template #trailing>
          <ClientOnly>
            <UBadge v-if="cart.count" :label="String(cart.count)" color="primary" size="sm" class="rounded-full" />
          </ClientOnly>
        </template>
      </UButton>
    </UContainer>

    <nav v-if="categories.length" class="border-t border-default/60">
      <UContainer
        class="flex items-center gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <UButton
          to="/"
          label="All"
          size="xs"
          class="shrink-0"
          :color="onHome ? 'primary' : 'neutral'"
          :variant="onHome ? 'soft' : 'ghost'"
        />
        <UButton
          v-for="c in categories"
          :key="c.slug"
          :to="`/categories/${c.slug}`"
          :label="c.name"
          size="xs"
          class="shrink-0"
          :color="isActive(c.slug) ? 'primary' : 'neutral'"
          :variant="isActive(c.slug) ? 'soft' : 'ghost'"
        />
      </UContainer>
    </nav>
  </header>
</template>
