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
        <Reveal v-for="(c, i) in CASE_STUDIES" :key="c.slug" :delay="i * 80">
          <NuxtLink
            :to="`/customers/${c.slug}`"
            class="group flex h-full flex-col rounded-card border border-default bg-white p-6 shadow-card transition duration-300 ease-stripe hover:-translate-y-1 hover:shadow-float"
          >
            <p class="text-cap font-medium uppercase tracking-[0.08em] text-primary">{{ c.industry }}</p>
            <h2 class="mt-2 text-h3 font-semibold text-ink">{{ c.store }}</h2>
            <p class="text-sm text-ink-subtle">{{ c.handle }}</p>
            <blockquote class="mt-4 text-ink">“{{ c.quote }}”</blockquote>
            <dl class="mt-5 grid grid-cols-3 gap-2 border-t border-default pt-4">
              <div v-for="m in c.metrics" :key="m.label">
                <dt class="text-[0.7rem] uppercase tracking-wide text-ink-subtle">{{ m.label }}</dt>
                <dd class="mt-0.5 text-sm font-semibold text-ink tabular-nums">{{ m.value }}</dd>
              </div>
            </dl>
            <div class="mt-5 flex-1" />
            <span class="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Read {{ c.store }}’s story
              <UIcon name="i-lucide-arrow-right" class="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </NuxtLink>
        </Reveal>
      </div>
    </UContainer>

    <!-- Buzz -->
    <section class="border-t border-default bg-tint py-16 sm:py-20">
      <UContainer>
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-cap font-medium uppercase tracking-[0.08em] text-primary">Buzz</p>
          <h2 class="mt-3 text-h2 font-semibold text-ink">What sellers are saying</h2>
        </div>
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal v-for="(t, i) in TESTIMONIALS" :key="t.handle" :delay="(i % 3) * 80">
            <TestimonialCard :testimonial="t" />
          </Reveal>
        </div>
      </UContainer>
    </section>
  </MarketingShell>
</template>
