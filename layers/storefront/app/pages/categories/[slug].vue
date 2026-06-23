<script setup lang="ts">
definePageMeta({ surface: 'store' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: catData } = await useFetch('/api/storefront/categories')
const category = computed(() => (catData.value?.categories ?? []).find((c) => c.slug === slug.value))
if (!category.value) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
}

const { data } = await useFetch(() => `/api/storefront/products?category=${slug.value}`)
const products = computed(() => data.value?.products ?? [])
</script>

<template>
  <main class="min-h-screen bg-default text-default">
    <StorefrontHeader />

    <UContainer class="py-10">
      <UButton to="/" icon="i-lucide-arrow-left" label="All products" variant="link" color="neutral" size="sm" class="px-0" />
      <h1 class="mt-3 mb-6 font-heading text-2xl font-semibold text-highlighted">{{ category?.name }}</h1>
      <StorefrontProductGrid :products="products" empty-text="No products in this category yet." />
    </UContainer>
  </main>
</template>
