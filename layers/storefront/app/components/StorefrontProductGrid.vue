<script setup lang="ts">
import type { StorefrontProduct } from '~~/shared/types/product'
import { formatPrice } from '~~/shared/types/product'

defineProps<{ products: StorefrontProduct[]; emptyText?: string }>()

const pres = useStoreMood()
const cart = useCart()

// Quick-add straight from the grid — the single biggest shopping-UX win. The card
// links to the PDP; this button is a sibling (never nested in the <a>) so a tap adds
// to the cart without navigating. We flash a tick for ~1.2s as confirmation.
const justAdded = ref<string | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null
function quickAdd(p: StorefrontProduct) {
  cart.add({
    productId: p.id,
    title: p.title,
    unitPriceMinor: p.price_minor,
    quantity: 1,
    imageUrl: p.image_url,
  })
  justAdded.value = p.id
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { justAdded.value = null }, 1200)
}
onBeforeUnmount(() => { if (flashTimer) clearTimeout(flashTimer) })
</script>

<template>
  <div v-if="!products.length" class="py-24 text-center">
    <UIcon name="i-lucide-package-open" class="mx-auto size-10 text-dimmed" />
    <p class="mt-3 text-muted">{{ emptyText ?? 'No products yet — check back soon.' }}</p>
  </div>

  <ul v-else class="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
    <li v-for="p in products" :key="p.id" class="group relative">
      <ULink
        :to="`/products/${p.slug}`"
        class="block rounded-[var(--ui-radius)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div
          class="relative overflow-hidden bg-muted"
          :class="[
            pres.card.aspect,
            pres.card.framed
              ? 'rounded-[var(--ui-radius)] border border-default transition duration-200 group-hover:border-primary/50 group-hover:shadow-[var(--t-shadow)] motion-safe:group-hover:-translate-y-1'
              : 'rounded-[var(--ui-radius)]',
          ]"
        >
          <img
            v-if="p.image_url"
            :src="p.image_url"
            :alt="p.title"
            loading="lazy"
            class="size-full object-cover transition duration-500 motion-safe:group-hover:scale-[1.04]"
          >
          <div v-else class="grid size-full place-items-center text-dimmed">
            <UIcon name="i-lucide-image-off" class="size-7" />
          </div>
        </div>

        <div class="mt-3" :class="pres.card.align === 'center' ? 'text-center' : ''">
          <h3 class="line-clamp-2 min-h-[2.5rem] font-heading font-medium leading-snug text-highlighted">
            {{ p.title }}
          </h3>
          <p class="mt-1 text-sm sm:text-base" :class="pres.card.price">
            {{ formatPrice(p.price_minor, p.currency) }}
          </p>
        </div>
      </ULink>

      <!-- Quick add — overlaps the image corner; sibling of the link, so a tap adds to
           cart instead of opening the PDP. Always visible on touch, reveals on hover. -->
      <UButton
        :icon="justAdded === p.id ? 'i-lucide-check' : 'i-lucide-plus'"
        :color="justAdded === p.id ? 'success' : 'primary'"
        :variant="pres.expressive ? 'solid' : 'soft'"
        size="sm"
        :aria-label="`Add ${p.title} to cart`"
        :class="[
          'absolute right-2 top-2 z-10 shadow-[var(--t-shadow)] backdrop-blur transition',
          pres.expressive ? 'rounded-full' : '',
          'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
        ]"
        @click="quickAdd(p)"
      />
    </li>
  </ul>
</template>
