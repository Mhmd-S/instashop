<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Manifesto — ${BRAND.name}`,
  description: `What ${BRAND.name} believes about selling online: your audience is already here, your shop should look like you, and your money is yours.`,
  robots: 'index, follow',
})
</script>

<template>
  <MarketingShell>
    <MarketingPageHero eyebrow="Manifesto" :title="`Why we built ${BRAND.name}`" :lede="MANIFESTO.lede" />

    <UContainer class="py-16 sm:py-20">
      <ol class="mx-auto max-w-3xl space-y-12">
        <li v-for="(p, i) in MANIFESTO.principles" :key="p.title" class="flex gap-5 sm:gap-7">
          <span class="select-none text-3xl font-semibold tabular-nums text-primary/40 sm:text-4xl">
            {{ String(i + 1).padStart(2, '0') }}
          </span>
          <div>
            <h2 class="text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">{{ p.title }}</h2>
            <p class="mt-3 text-muted">{{ p.body }}</p>
          </div>
        </li>
      </ol>

      <p class="mx-auto mt-16 max-w-2xl border-t border-default pt-10 text-center text-lg text-highlighted text-balance">
        If that sounds like the way you want to sell, we would love to have you.
      </p>
    </UContainer>
  </MarketingShell>
</template>
