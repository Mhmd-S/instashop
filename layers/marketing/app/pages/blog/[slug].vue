<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })

const route = useRoute()
const post = computed(() => POSTS.find((p) => p.slug === route.params.slug))

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

const { adminUrl } = useSurfaceUrls()
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

// Up to two other posts to read next.
const more = computed(() => POSTS.filter((p) => p.slug !== route.params.slug).slice(0, 2))

useSeoMeta({
  title: () => `${post.value!.title} — ${BRAND.name}`,
  description: () => post.value!.excerpt,
  ogType: 'article',
  robots: 'index, follow',
})
</script>

<template>
  <MarketingShell>
    <article v-if="post">
      <UContainer class="py-14 sm:py-16">
        <div class="mx-auto max-w-3xl">
          <UButton to="/blog" label="All posts" color="neutral" variant="link" icon="i-lucide-arrow-left" class="-ml-2 mb-4" />
          <div class="flex items-center gap-3 text-xs text-dimmed">
            <UBadge :label="post.tag" color="primary" variant="subtle" size="sm" />
            <time :datetime="post.date">{{ fmt(post.date) }}</time>
            <span>·</span>
            <span>{{ post.author }}</span>
          </div>
          <h1 class="mt-4 text-4xl font-semibold tracking-tight text-highlighted text-balance">{{ post.title }}</h1>
          <p class="mt-4 text-lg text-muted text-balance">{{ post.excerpt }}</p>

          <MarketingProse :html="post.body" class="mt-10" />

          <div class="mt-12 rounded-2xl border border-default bg-[color-mix(in_oklab,var(--ui-primary)_5%,var(--ui-bg))] p-8 text-center">
            <h2 class="text-xl font-semibold text-highlighted">Turn your feed into a shop</h2>
            <p class="mx-auto mt-2 max-w-md text-muted">Put these ideas to work. Connect your Instagram and open your store in minutes.</p>
            <UButton :to="adminUrl('/signup')" external label="Get started" color="primary" size="lg" trailing-icon="i-lucide-arrow-right" class="mt-5" />
          </div>
        </div>
      </UContainer>

      <section v-if="more.length" class="border-t border-default bg-[color-mix(in_oklab,var(--ui-primary)_4%,var(--ui-bg))] py-14">
        <UContainer>
          <div class="mx-auto max-w-3xl">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-dimmed">Keep reading</h2>
            <div class="mt-6 grid gap-6 sm:grid-cols-2">
              <NuxtLink v-for="p in more" :key="p.slug" :to="`/blog/${p.slug}`" class="group block rounded-xl border border-default bg-default p-5">
                <UBadge :label="p.tag" color="primary" variant="subtle" size="sm" />
                <h3 class="mt-3 font-semibold text-highlighted group-hover:text-primary">{{ p.title }}</h3>
                <p class="mt-2 line-clamp-2 text-sm text-muted">{{ p.excerpt }}</p>
              </NuxtLink>
            </div>
          </div>
        </UContainer>
      </section>
    </article>
  </MarketingShell>
</template>
