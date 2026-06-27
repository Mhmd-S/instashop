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
      <div class="mx-auto max-w-3xl divide-y divide-default">
        <article v-for="post in posts" :key="post.slug" class="py-8 first:pt-0">
          <NuxtLink :to="`/blog/${post.slug}`" class="group block">
            <div class="flex items-center gap-3 text-xs text-dimmed">
              <UBadge :label="post.tag" color="primary" variant="subtle" size="sm" />
              <time :datetime="post.date">{{ fmt(post.date) }}</time>
            </div>
            <h2 class="mt-3 text-2xl font-semibold tracking-tight text-highlighted group-hover:text-primary">
              {{ post.title }}
            </h2>
            <p class="mt-2 text-muted">{{ post.excerpt }}</p>
            <span class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Read more
              <UIcon name="i-lucide-arrow-right" class="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </NuxtLink>
        </article>
      </div>
    </UContainer>
  </MarketingShell>
</template>
