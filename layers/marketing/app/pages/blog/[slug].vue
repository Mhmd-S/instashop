<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })

const route = useRoute()
const post = computed(() => POSTS.find((p) => p.slug === route.params.slug))

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

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
          <div class="flex items-center gap-3 text-xs text-ink-subtle">
            <UBadge :label="post.tag" color="primary" variant="subtle" size="sm" />
            <time :datetime="post.date">{{ fmt(post.date) }}</time>
            <span>·</span>
            <span>{{ post.author }}</span>
          </div>
          <h1 class="mt-4 text-hero font-semibold text-ink text-balance">{{ post.title }}</h1>
          <p class="mt-5 text-lead text-ink-muted text-balance">{{ post.excerpt }}</p>

          <MarketingProse :html="post.body" class="mt-10" />

          <MarketingCta
            class="mt-14"
            title="Turn your feed into a shop"
            body="Put these ideas to work. Connect your Instagram and open your store in minutes."
          />
        </div>
      </UContainer>

      <section v-if="more.length" class="border-t border-default bg-tint py-14">
        <UContainer>
          <div class="mx-auto max-w-3xl">
            <h2 class="text-cap font-medium uppercase tracking-[0.08em] text-ink-subtle">Keep reading</h2>
            <div class="mt-6 grid gap-6 sm:grid-cols-2">
              <NuxtLink
                v-for="p in more"
                :key="p.slug"
                :to="`/blog/${p.slug}`"
                class="group block rounded-card border border-default bg-white p-5 shadow-card transition duration-300 ease-stripe hover:-translate-y-1 hover:shadow-float"
              >
                <UBadge :label="p.tag" color="primary" variant="subtle" size="sm" />
                <h3 class="mt-3 font-semibold text-ink group-hover:text-primary">{{ p.title }}</h3>
                <p class="mt-2 line-clamp-2 text-sm text-ink-muted">{{ p.excerpt }}</p>
              </NuxtLink>
            </div>
          </div>
        </UContainer>
      </section>
    </article>
  </MarketingShell>
</template>
