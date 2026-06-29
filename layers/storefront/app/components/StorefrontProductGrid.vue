<script setup lang="ts">
import type { StorefrontProduct } from '~~/shared/types/product'
import { formatPrice } from '~~/shared/types/product'

defineProps<{ products: StorefrontProduct[]; emptyText?: string }>()

const ad = useStoreArtDirection()
const cart = useCart()

// Quick-add straight from the gallery — kept understated (a monochrome mark that
// fades in on hover), so it never competes with the photography. The card links to
// the PDP; this button is a sibling (never nested in the <a>) so a tap adds without
// navigating. A tick flashes for ~1.2s as confirmation.
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
    <p class="text-sm text-muted">{{ emptyText ?? 'New shop — pieces are on their way.' }}</p>
  </div>

  <ul v-else class="grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-8 sm:gap-y-16 lg:grid-cols-3">
    <li v-for="p in products" :key="p.id" class="group relative">
      <ULink :to="`/products/${p.slug}`" class="block focus:outline-none focus-visible:ring-1 focus-visible:ring-(--ui-text)">
        <div class="relative overflow-hidden bg-(--t-paper-2)" :class="ad.card.aspect">
          <img
            v-if="p.image_url"
            :src="p.image_url"
            :alt="p.title"
            loading="lazy"
            class="size-full object-cover transition duration-700 ease-soft"
            :class="ad.card.hover === 'zoom' ? 'motion-safe:group-hover:scale-[1.03]' : ''"
          >
          <div v-else class="grid size-full place-items-center text-muted/50">
            <UIcon name="i-lucide-image" class="size-6" />
          </div>
        </div>

        <div class="mt-3.5">
          <h3 class="truncate text-sm font-normal leading-snug text-highlighted">{{ p.title }}</h3>
          <p class="mt-1 text-sm text-muted">{{ formatPrice(p.price_minor, p.currency) }}</p>
        </div>
      </ULink>

      <!-- Quick add — monochrome, fades in on hover (always visible on touch). -->
      <button
        type="button"
        :aria-label="`Add ${p.title} to bag`"
        class="absolute right-2.5 top-2.5 grid size-9 place-items-center rounded-full border border-(--t-rule-strong) bg-(--ui-bg)/85 text-highlighted backdrop-blur transition duration-200 hover:border-(--ui-text) focus:outline-none focus-visible:ring-1 focus-visible:ring-(--ui-text) sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        @click="quickAdd(p)"
      >
        <UIcon :name="justAdded === p.id ? 'i-lucide-check' : 'i-lucide-plus'" class="size-4" />
      </button>
    </li>
  </ul>
</template>
