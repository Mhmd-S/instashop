<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Pricing — ${BRAND.name}`,
  description: `Simple, honest pricing for ${BRAND.name}. Start free, upgrade when you grow. Payments settle to your own Stripe account — no lock-in.`,
  robots: 'index, follow',
})

const { adminUrl } = useSurfaceUrls()

// Studio is "contact us"; the rest sign up directly on the admin host.
const ctaTo = (tier: (typeof PRICING)[number]) =>
  tier.priceMonthly === null ? `mailto:hello@chanis.app` : adminUrl('/signup')
const ctaExternal = (tier: (typeof PRICING)[number]) => tier.priceMonthly !== null
</script>

<template>
  <MarketingShell>
    <MarketingPageHero
      eyebrow="Pricing"
      title="Start free. Upgrade when you grow."
      lede="No contracts, no lock-in, and your money settles straight to your own account. Pick a plan when you outgrow the last one."
    />

    <UContainer class="py-16 sm:py-20">
      <div class="grid items-start gap-6 lg:grid-cols-3">
        <UCard
          v-for="tier in PRICING"
          :key="tier.name"
          :variant="tier.featured ? 'solid' : 'subtle'"
          :class="[
            'relative flex h-full flex-col',
            tier.featured ? 'ring-2 ring-primary' : '',
          ]"
        >
          <UBadge
            v-if="tier.featured"
            label="Most popular"
            color="primary"
            variant="solid"
            class="absolute -top-3 left-1/2 -translate-x-1/2"
          />
          <h2 class="text-lg font-semibold text-highlighted">{{ tier.name }}</h2>
          <p class="mt-1 text-sm text-muted">{{ tier.blurb }}</p>

          <p class="mt-6 flex items-baseline gap-1">
            <template v-if="tier.priceMonthly === null">
              <span class="text-3xl font-semibold text-highlighted">Custom</span>
            </template>
            <template v-else-if="tier.priceMonthly === 0">
              <span class="text-4xl font-semibold text-highlighted">Free</span>
            </template>
            <template v-else>
              <span class="text-4xl font-semibold text-highlighted">{{ PRICING_CURRENCY }}{{ tier.priceMonthly }}</span>
              <span class="text-muted">/ month</span>
            </template>
          </p>
          <p v-if="tier.note" class="mt-1 text-xs text-dimmed">{{ tier.note }}</p>

          <UButton
            :to="ctaTo(tier)"
            :external="ctaExternal(tier)"
            :label="tier.cta"
            :color="tier.featured ? 'primary' : 'neutral'"
            :variant="tier.featured ? 'solid' : 'subtle'"
            size="lg"
            block
            class="mt-6"
          />

          <ul class="mt-6 space-y-3 border-t border-default pt-6 text-sm">
            <li v-for="feat in tier.features" :key="feat" class="flex gap-2.5">
              <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span class="text-muted">{{ feat }}</span>
            </li>
          </ul>
        </UCard>
      </div>

      <!-- FAQ -->
      <section class="mx-auto mt-20 max-w-3xl">
        <h2 class="text-center text-2xl font-semibold tracking-tight text-highlighted">Questions, answered</h2>
        <div class="mt-8 divide-y divide-default border-y border-default">
          <div v-for="item in PRICING_FAQ" :key="item.q" class="py-5">
            <h3 class="font-medium text-highlighted">{{ item.q }}</h3>
            <p class="mt-2 text-sm text-muted">{{ item.a }}</p>
          </div>
        </div>
      </section>
    </UContainer>
  </MarketingShell>
</template>
