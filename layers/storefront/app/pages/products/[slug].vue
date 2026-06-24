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
const added = ref(false)
function addToCart() {
  cart.add({
    productId: product.id,
    title: product.title,
    unitPriceMinor: product.price_minor,
    quantity: 1,
    imageUrl: product.image_url,
  })
  added.value = true
}
</script>

<template>
  <main class="min-h-screen bg-default text-default">
    <StorefrontHeader />

    <UContainer class="py-10">
      <UButton
        to="/"
        icon="i-lucide-arrow-left"
        label="Back to store"
        variant="link"
        color="neutral"
        size="sm"
        class="px-0"
      />

      <div class="mt-6 grid gap-8 md:grid-cols-2 lg:gap-12">
        <div>
          <div class="aspect-square overflow-hidden rounded-xl border border-default bg-muted shadow-sm">
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

          <div v-if="gallery.length > 1" class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="(img, i) in gallery"
              :key="i"
              type="button"
              class="size-16 overflow-hidden rounded-lg ring-2 transition focus:outline-none focus-visible:ring-primary"
              :class="i === selected ? 'ring-primary' : 'ring-transparent hover:ring-default'"
              :aria-label="`View image ${i + 1}`"
              :aria-current="i === selected"
              @click="selected = i"
            >
              <img :src="img.public_url!" :alt="img.alt ?? ''" class="size-full object-cover">
            </button>
          </div>
        </div>

        <div class="flex flex-col">
          <h1 class="font-heading text-3xl font-semibold tracking-tight text-balance text-highlighted">{{ product.title }}</h1>
          <p class="mt-3 text-3xl font-semibold text-primary">{{ formatPrice(product.price_minor, product.currency) }}</p>
          <p v-if="product.description" class="mt-5 whitespace-pre-line leading-relaxed text-muted">{{ product.description }}</p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
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
          <p class="mt-3 flex items-center gap-1.5 text-sm text-muted">
            <UIcon name="i-lucide-truck" class="size-4 shrink-0" />
            Cash on delivery — pay when it arrives.
          </p>
        </div>
      </div>
    </UContainer>
  </main>
</template>
