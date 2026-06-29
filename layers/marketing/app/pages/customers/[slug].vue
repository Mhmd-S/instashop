<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })

const route = useRoute()
const study = computed(() => CASE_STUDIES.find((c) => c.slug === route.params.slug))

// Unknown slug → 404 (matches the surface guard's createError convention).
if (!study.value) {
  throw createError({ statusCode: 404, statusMessage: 'Customer story not found' })
}

useSeoMeta({
  title: () => `${study.value!.store} — ${BRAND.name} customer story`,
  description: () => study.value!.summary,
  robots: 'index, follow',
})
</script>

<template>
  <MarketingShell>
    <article v-if="study">
      <section class="relative overflow-hidden border-b border-default bg-tint">
        <div
          class="pointer-events-none absolute right-0 top-0 h-80 w-176 max-w-full opacity-35 blur-[80px]"
          :style="{ background: 'var(--gradient-ig-halo)' }"
          aria-hidden="true"
        />
        <UContainer class="relative py-16 sm:py-20">
          <div class="mx-auto max-w-3xl">
            <UButton to="/customers" label="All customers" color="neutral" variant="link" icon="i-lucide-arrow-left" class="-ml-2 mb-4" />
            <p class="text-cap font-medium uppercase tracking-[0.08em] text-primary">{{ study.industry }}</p>
            <h1 class="mt-2 text-hero font-semibold text-ink">{{ study.store }}</h1>
            <p class="mt-1 text-ink-subtle">{{ study.handle }}</p>
            <p class="mt-5 text-lead text-ink-muted text-balance">{{ study.summary }}</p>
            <dl class="mt-9 grid max-w-lg grid-cols-3 gap-4">
              <div v-for="m in study.metrics" :key="m.label" class="rounded-card border border-default bg-white p-4 shadow-card">
                <dt class="text-[0.7rem] uppercase tracking-wide text-ink-subtle">{{ m.label }}</dt>
                <dd class="mt-1 text-lg font-semibold text-ink tabular-nums">{{ m.value }}</dd>
              </div>
            </dl>
          </div>
        </UContainer>
      </section>

      <UContainer class="py-14 sm:py-16">
        <div class="mx-auto max-w-3xl">
          <blockquote class="border-l-4 border-primary pl-5 text-h3 font-medium text-ink text-balance">
            “{{ study.quote }}”
          </blockquote>
          <MarketingProse :html="study.body" class="mt-10" />

          <MarketingCta
            class="mt-14"
            title="Your shop could be next."
            body="Connect your Instagram and start selling in minutes — free to begin."
          />
        </div>
      </UContainer>
    </article>
  </MarketingShell>
</template>
