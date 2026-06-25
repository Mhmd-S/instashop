<script setup lang="ts">
import { formatPrice } from '~~/shared/types/product'

definePageMeta({ surface: 'store' })

const route = useRoute()
const { data } = await useFetch(`/api/storefront/products/${route.params.slug}`)
if (!data.value?.product) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })
}
const product = data.value.product

// Gallery: prefer product_images, fall back to the single image_url.
const gallery = computed(() => {
  const imgs = (product.images ?? []).filter((i) => i.public_url)
  if (imgs.length) return imgs
  return product.image_url
    ? [{ public_url: product.image_url, alt: product.title, is_video: false, video_url: null }]
    : []
})
const selected = ref(0)

const cart = useCart()
const cta = useStoreCta()
const qty = ref(1)
const added = ref(false)
function addToCart() {
  cart.add({
    productId: product.id,
    title: product.title,
    unitPriceMinor: product.price_minor,
    quantity: qty.value,
    imageUrl: product.image_url,
  })
  added.value = true
}
const priceLabel = computed(() => formatPrice(product.price_minor, product.currency))
</script>

<template>
  <main class="min-h-screen bg-default text-default">
    <StorefrontHeader />

    <UContainer class="py-8 sm:py-10">
      <UButton
        to="/"
        icon="i-lucide-arrow-left"
        label="Back to store"
        variant="link"
        color="neutral"
        size="sm"
        class="px-0"
      />

      <div class="mt-6 grid gap-8 md:grid-cols-2 lg:gap-14">
        <!-- Gallery -->
        <div class="md:sticky md:top-24 md:self-start">
          <div class="aspect-square overflow-hidden rounded-[var(--ui-radius)] border border-default bg-muted shadow-[var(--t-shadow)]">
            <img
              v-if="gallery[selected]?.public_url"
              :src="gallery[selected]!.public_url!"
              :alt="gallery[selected]!.alt ?? product.title"
              class="size-full object-cover"
            >
            <div v-else class="grid size-full place-items-center text-dimmed">
              <UIcon name="i-lucide-image-off" class="size-10" />
            </div>
          </div>

          <div v-if="gallery.length > 1" class="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
            <button
              v-for="(img, i) in gallery"
              :key="i"
              type="button"
              class="aspect-square overflow-hidden rounded-[var(--ui-radius)] ring-2 transition focus:outline-none focus-visible:ring-primary"
              :class="i === selected ? 'ring-primary' : 'ring-transparent hover:ring-default'"
              :aria-label="`View image ${i + 1}`"
              :aria-current="i === selected"
              @click="selected = i"
            >
              <img :src="img.public_url!" :alt="img.alt ?? ''" class="size-full object-cover">
            </button>
          </div>
        </div>

        <!-- Details -->
        <div class="flex flex-col">
          <h1 class="font-heading text-3xl font-semibold tracking-tight text-balance text-highlighted sm:text-4xl">{{ product.title }}</h1>
          <p class="mt-3 text-3xl font-semibold text-primary">{{ priceLabel }}</p>

          <p v-if="product.description" class="mt-5 whitespace-pre-line leading-relaxed text-muted">{{ product.description }}</p>

          <!-- Quantity -->
          <div class="mt-8 flex items-center gap-4">
            <span class="text-sm font-medium text-highlighted">Quantity</span>
            <div class="inline-flex items-center rounded-[var(--ui-radius)] border border-default">
              <UButton
                icon="i-lucide-minus" color="neutral" variant="ghost" size="sm"
                aria-label="Decrease quantity" :disabled="qty <= 1" @click="qty = Math.max(1, qty - 1)"
              />
              <span class="w-10 text-center text-sm font-medium tabular-nums">{{ qty }}</span>
              <UButton
                icon="i-lucide-plus" color="neutral" variant="ghost" size="sm"
                aria-label="Increase quantity" @click="qty = qty + 1"
              />
            </div>
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-3">
            <UButton
              color="primary"
              v-bind="cta"
              size="lg"
              icon="i-lucide-shopping-cart"
              label="Add to cart"
              @click="addToCart"
            />
            <UButton
              v-if="added"
              to="/cart"
              variant="soft"
              color="success"
              size="lg"
              icon="i-lucide-check"
              label="View cart"
            />
          </div>

          <!-- Trust cues -->
          <dl class="mt-8 space-y-3 border-t border-default pt-6 text-sm text-muted">
            <div class="flex items-center gap-2.5">
              <UIcon name="i-lucide-truck" class="size-4 shrink-0 text-primary" />
              <span>Cash on delivery — pay when it arrives.</span>
            </div>
            <div class="flex items-center gap-2.5">
              <UIcon name="i-lucide-shield-check" class="size-4 shrink-0 text-primary" />
              <span>Secure checkout. Your details stay private.</span>
            </div>
          </dl>
        </div>
      </div>
    </UContainer>

    <!-- Sticky add-to-cart on mobile, so the CTA is always within thumb's reach. -->
    <div class="sticky bottom-0 z-20 border-t border-default bg-default/90 backdrop-blur md:hidden">
      <div class="flex items-center justify-between gap-4 px-4 py-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-highlighted">{{ product.title }}</p>
          <p class="text-sm font-semibold text-primary">{{ priceLabel }}</p>
        </div>
        <UButton color="primary" v-bind="cta" icon="i-lucide-shopping-cart" label="Add" @click="addToCart" />
      </div>
    </div>
  </main>
</template>
