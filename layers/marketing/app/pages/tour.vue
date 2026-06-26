<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Tour — ${BRAND.name}`,
  description: `A guided tour of ${BRAND.name}: import from Instagram, auto-matched branding, real checkout, AI product drafts and more.`,
  robots: 'index, follow',
})

const { adminUrl } = useSurfaceUrls()
</script>

<template>
  <MarketingShell>
    <MarketingPageHero
      eyebrow="Tour"
      title="Everything you need to sell from your feed"
      lede="A walk through the features that take you from a page of posts to a shop taking real orders."
    />

    <!-- Alternating feature rows -->
    <UContainer class="py-16 sm:py-24">
      <div class="mx-auto flex max-w-5xl flex-col gap-16 sm:gap-24">
        <section
          v-for="(f, i) in FEATURES"
          :key="f.title"
          class="grid items-center gap-8 sm:grid-cols-2 sm:gap-12"
        >
          <div :class="i % 2 === 1 ? 'sm:order-2' : ''">
            <span class="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="f.icon" class="size-6" />
            </span>
            <h2 class="mt-5 text-2xl font-semibold tracking-tight text-highlighted">{{ f.title }}</h2>
            <p class="mt-3 text-muted">{{ f.detail }}</p>
          </div>
          <!-- Decorative on-brand panel (no stock art) -->
          <div :class="i % 2 === 1 ? 'sm:order-1' : ''">
            <div class="grid aspect-[4/3] place-items-center rounded-2xl border border-default bg-[linear-gradient(135deg,color-mix(in_oklab,var(--ui-primary)_12%,var(--ui-bg)),var(--ui-bg))]">
              <UIcon :name="f.icon" class="size-16 text-primary/40" />
            </div>
          </div>
        </section>
      </div>

      <div class="mx-auto mt-20 max-w-2xl rounded-2xl border border-default bg-[color-mix(in_oklab,var(--ui-primary)_5%,var(--ui-bg))] p-8 text-center">
        <h2 class="text-2xl font-semibold text-highlighted">Ready to see it on your own feed?</h2>
        <p class="mx-auto mt-3 max-w-md text-muted">Connect your account and watch your posts become a shop. Free to start.</p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <UButton :to="adminUrl('/signup')" external label="Get started" color="primary" size="lg" trailing-icon="i-lucide-arrow-right" />
          <UButton to="/screenshots" label="See screenshots" color="neutral" variant="subtle" size="lg" />
        </div>
      </div>
    </UContainer>
  </MarketingShell>
</template>
