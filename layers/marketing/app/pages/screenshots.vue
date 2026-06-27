<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Screenshots & video — ${BRAND.name}`,
  description: `See what ${BRAND.name} looks like: the seller dashboard, a live storefront, the product and theme editors, and short videos of the flow.`,
  robots: 'index, follow',
})

const { adminUrl } = useSurfaceUrls()
</script>

<template>
  <MarketingShell>
    <MarketingPageHero
      eyebrow="Screenshots & video"
      title="See it before you sign up"
      lede="A look at the dashboard, a real storefront, and the editors — plus short videos of how it all fits together."
    />

    <UContainer class="py-16 sm:py-20">
      <div class="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        <ScreenFrame v-for="shot in GALLERY" :key="shot.title" :shot="shot" />
      </div>

      <p class="mx-auto mt-14 max-w-xl text-center text-sm text-dimmed">
        Storefronts are matched to each seller’s brand, so no two look alike — the frames above are
        representative. The fastest way to see yours is to connect your feed.
      </p>
      <div class="mt-6 text-center">
        <UButton :to="adminUrl('/signup')" external label="Build mine" color="primary" size="lg" trailing-icon="i-lucide-arrow-right" />
      </div>
    </UContainer>
  </MarketingShell>
</template>
