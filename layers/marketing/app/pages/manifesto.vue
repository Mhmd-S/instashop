<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Manifesto — ${BRAND.name}`,
  description: `What ${BRAND.name} believes about selling online: your audience is already here, your shop should look like you, and your money is yours.`,
  robots: 'index, follow',
})

const { adminUrl } = useSurfaceUrls()
</script>

<template>
  <MarketingShell>
    <MarketingPageHero eyebrow="Manifesto" :title="`Why we built ${BRAND.name}`" :lede="MANIFESTO.lede" />

    <UContainer class="py-16 sm:py-24">
      <ol class="mx-auto max-w-3xl space-y-12 sm:space-y-16">
        <Reveal
          v-for="(p, i) in MANIFESTO.principles"
          :key="p.title"
          as="li"
          class="flex gap-5 sm:gap-8"
        >
          <span
            class="select-none bg-clip-text text-4xl font-semibold tabular-nums text-transparent sm:text-5xl"
            :style="{ backgroundImage: 'var(--gradient-ig)' }"
          >
            {{ String(i + 1).padStart(2, '0') }}
          </span>
          <div class="pt-1">
            <h2 class="text-h3 font-semibold text-ink">{{ p.title }}</h2>
            <p class="mt-3 text-ink-muted leading-relaxed">{{ p.body }}</p>
          </div>
        </Reveal>
      </ol>

      <div class="mx-auto mt-20 max-w-2xl border-t border-default pt-12 text-center">
        <p class="text-lead text-ink text-balance">
          If that sounds like the way you want to sell, we would love to have you.
        </p>
        <UButton
          :to="adminUrl('/signup')"
          external
          label="Open your shop"
          color="primary"
          size="xl"
          trailing-icon="i-lucide-arrow-right"
          class="mt-7"
        />
      </div>
    </UContainer>
  </MarketingShell>
</template>
