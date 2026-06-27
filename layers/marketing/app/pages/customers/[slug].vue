<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })

const route = useRoute()
const study = computed(() => CASE_STUDIES.find((c) => c.slug === route.params.slug))

// Unknown slug → 404 (matches the surface guard's createError convention).
if (!study.value) {
  throw createError({ statusCode: 404, statusMessage: 'Customer story not found' })
}

const { adminUrl } = useSurfaceUrls()

useSeoMeta({
  title: () => `${study.value!.store} — ${BRAND.name} customer story`,
  description: () => study.value!.summary,
  robots: 'index, follow',
})
</script>

<template>
  <MarketingShell>
    <article v-if="study">
      <section class="border-b border-default bg-[color-mix(in_oklab,var(--ui-primary)_4%,var(--ui-bg))]">
        <UContainer class="py-14 sm:py-16">
          <div class="mx-auto max-w-3xl">
            <UButton to="/customers" label="All customers" color="neutral" variant="link" icon="i-lucide-arrow-left" class="-ml-2 mb-4" />
            <p class="text-sm font-semibold uppercase tracking-wide text-primary">{{ study.industry }}</p>
            <h1 class="mt-2 text-4xl font-semibold tracking-tight text-highlighted">{{ study.store }}</h1>
            <p class="mt-1 text-muted">{{ study.handle }}</p>
            <p class="mt-5 text-lg text-muted text-balance">{{ study.summary }}</p>
            <dl class="mt-8 grid max-w-lg grid-cols-3 gap-4">
              <div v-for="m in study.metrics" :key="m.label" class="rounded-xl border border-default bg-default p-4">
                <dt class="text-[0.7rem] uppercase tracking-wide text-dimmed">{{ m.label }}</dt>
                <dd class="mt-1 text-lg font-semibold text-highlighted">{{ m.value }}</dd>
              </div>
            </dl>
          </div>
        </UContainer>
      </section>

      <UContainer class="py-14 sm:py-16">
        <div class="mx-auto max-w-3xl">
          <blockquote class="border-l-4 border-primary pl-5 text-xl font-medium text-highlighted text-balance">
            “{{ study.quote }}”
          </blockquote>
          <MarketingProse :html="study.body" class="mt-10" />

          <div class="mt-12 rounded-2xl border border-default bg-[color-mix(in_oklab,var(--ui-primary)_5%,var(--ui-bg))] p-8 text-center">
            <h2 class="text-xl font-semibold text-highlighted">Your shop could be next.</h2>
            <p class="mx-auto mt-2 max-w-md text-muted">Connect your Instagram and start selling in minutes — free to begin.</p>
            <UButton :to="adminUrl('/signup')" external label="Get started" color="primary" size="lg" trailing-icon="i-lucide-arrow-right" class="mt-5" />
          </div>
        </div>
      </UContainer>
    </article>
  </MarketingShell>
</template>
