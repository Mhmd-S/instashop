<script setup lang="ts">
import type { StorefrontProduct } from '~~/shared/types/product'
import { formatPrice } from '~~/shared/types/product'

defineProps<{ products: StorefrontProduct[]; emptyText?: string }>()
</script>

<template>
  <div v-if="!products.length" class="py-24 text-center">
    <UIcon name="i-lucide-package-open" class="mx-auto size-10 text-dimmed" />
    <p class="mt-3 text-muted">{{ emptyText ?? 'No products yet — check back soon.' }}</p>
  </div>

  <ul v-else class="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 lg:grid-cols-3">
    <li v-for="p in products" :key="p.id">
      <ULink
        :to="`/products/${p.slug}`"
        class="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <UCard
          variant="outline"
          class="overflow-hidden transition duration-200 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-primary/60 motion-safe:group-hover:-translate-y-1"
          :ui="{ header: 'p-0', body: 'p-(--t-space-card)' }"
        >
          <template #header>
            <div class="aspect-square overflow-hidden bg-muted">
              <img
                v-if="p.image_url"
                :src="p.image_url"
                :alt="p.title"
                loading="lazy"
                class="size-full object-cover transition duration-300 motion-safe:group-hover:scale-105"
              >
              <div v-else class="grid size-full place-items-center text-dimmed">
                <UIcon name="i-lucide-image-off" class="size-7" />
              </div>
            </div>
          </template>

          <h3 class="line-clamp-2 min-h-[2.5rem] font-medium leading-snug text-highlighted">{{ p.title }}</h3>
          <p class="mt-1.5 font-semibold text-primary">{{ formatPrice(p.price_minor, p.currency) }}</p>
        </UCard>
      </ULink>
    </li>
  </ul>
</template>
