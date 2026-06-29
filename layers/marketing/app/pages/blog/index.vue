<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Blog — ${BRAND.name}`,
  description: `News, playbooks and notes from the ${BRAND.name} team on selling from your Instagram feed.`,
  robots: 'index, follow',
})

// Newest first, by ISO date.
const posts = computed(() => [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1)))
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
</script>

<template>
  <MarketingShell>
    <MarketingPageHero
      eyebrow="Blog"
      title="Notes from the workshop"
      lede="Playbooks for selling from your feed, pricing what you make, and the occasional look behind the build."
    />

    <UContainer class="py-16 sm:py-20">
      <div class="mx-auto max-w-3xl space-y-6">
        <Reveal v-for="(post, i) in posts" :key="post.slug" :delay="i * 70">
          <NuxtLink
            :to="`/blog/${post.slug}`"
            class="group block rounded-card border border-default bg-white p-6 shadow-card transition duration-300 ease-stripe hover:-translate-y-1 hover:shadow-float sm:p-7"
          >
            <div class="flex items-center gap-3 text-xs text-ink-subtle">
              <UBadge :label="post.tag" color="primary" variant="subtle" size="sm" />
              <time :datetime="post.date">{{ fmt(post.date) }}</time>
            </div>
            <h2 class="mt-3 text-h3 font-semibold text-ink group-hover:text-primary">
              {{ post.title }}
            </h2>
            <p class="mt-2 text-ink-muted leading-relaxed">{{ post.excerpt }}</p>
            <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Read more
              <UIcon name="i-lucide-arrow-right" class="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </NuxtLink>
        </Reveal>
      </div>
    </UContainer>
  </MarketingShell>
</template>
