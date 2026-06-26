<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Customers — ${BRAND.name}`,
  description: `Real shops built on ${BRAND.name}: case studies and what sellers say about turning their Instagram into a storefront.`,
  robots: 'index, follow',
})
</script>

<template>
  <MarketingShell>
    <MarketingPageHero
      eyebrow="Customers"
      title="Shops that started as a feed"
      lede="Makers, florists and small labels who turned an Instagram following into a storefront — and what changed when they did."
    />

    <!-- Case studies -->
    <UContainer class="py-16 sm:py-20">
      <div class="grid gap-8 lg:grid-cols-3">
        <UCard v-for="c in CASE_STUDIES" :key="c.slug" variant="subtle" class="flex h-full flex-col">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">{{ c.industry }}</p>
          <h2 class="mt-2 text-xl font-semibold text-highlighted">{{ c.store }}</h2>
          <p class="text-sm text-muted">{{ c.handle }}</p>
          <blockquote class="mt-4 text-highlighted">“{{ c.quote }}”</blockquote>
          <dl class="mt-5 grid grid-cols-3 gap-2 border-t border-default pt-4">
            <div v-for="m in c.metrics" :key="m.label">
              <dt class="text-[0.7rem] uppercase tracking-wide text-dimmed">{{ m.label }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-highlighted">{{ m.value }}</dd>
            </div>
          </dl>
          <div class="mt-5 flex-1" />
          <UButton
            :to="`/customers/${c.slug}`"
            :label="`Read ${c.store}’s story`"
            color="neutral"
            variant="subtle"
            trailing-icon="i-lucide-arrow-right"
            class="self-start"
          />
        </UCard>
      </div>
    </UContainer>

    <!-- Buzz -->
    <section class="border-t border-default bg-[color-mix(in_oklab,var(--ui-primary)_4%,var(--ui-bg))] py-16 sm:py-20">
      <UContainer>
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-semibold uppercase tracking-wide text-primary">Buzz</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted">What sellers are saying</h2>
        </div>
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <TestimonialCard v-for="t in TESTIMONIALS" :key="t.handle" :testimonial="t" />
        </div>
      </UContainer>
    </section>
  </MarketingShell>
</template>
