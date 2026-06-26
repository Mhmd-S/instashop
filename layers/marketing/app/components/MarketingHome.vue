<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

const { adminUrl } = useSurfaceUrls()
const handle = ref('')

// Landing SEO + social card. Absolute URLs (built from the configured site URL) so
// scrapers resolve the OG image correctly.
const siteUrl = useRuntimeConfig().public.siteUrl
const ogImage = `${siteUrl}/og.png`
const title = `${BRAND.name} — ${BRAND.tagline}`
useSeoMeta({
  title,
  description: BRAND.description,
  ogType: 'website',
  ogSiteName: BRAND.name,
  ogUrl: siteUrl,
  ogTitle: title,
  ogDescription: BRAND.description,
  ogImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: BRAND.description,
  twitterImage: ogImage,
})
useHead({ link: [{ rel: 'canonical', href: siteUrl }] })

// Overview leads with the three headline features; the rest live on the tour.
const overview = FEATURES.slice(0, 3)
const steps = [
  { icon: 'i-lucide-instagram', title: 'Connect', body: 'Link your Instagram account in a couple of taps — read-only, we never post for you.' },
  { icon: 'i-lucide-mouse-pointer-click', title: 'Curate', body: 'Pick the posts to sell. Titles, prices and branding come pre-filled for you.' },
  { icon: 'i-lucide-rocket', title: 'Sell', body: 'Publish and share one link. Card payments land in your own account from order one.' },
]
</script>

<template>
  <div class="flex min-h-screen flex-col bg-default text-default">
    <MarketingHeader />

    <main class="flex-1">
      <!-- Hero / Overview -->
      <UContainer>
        <section class="mx-auto max-w-3xl py-20 text-center sm:py-28">
          <UBadge
            color="primary"
            variant="subtle"
            label="Instagram to storefront in minutes"
            icon="i-lucide-instagram"
            size="lg"
            class="mb-6"
          />
          <h1 class="text-4xl font-semibold tracking-tight text-highlighted text-balance sm:text-6xl">
            Turn your Instagram into a shop.
          </h1>
          <p class="mx-auto mt-6 max-w-xl text-lg text-muted text-balance">
            Paste your page — we import your posts as products and match your vibe automatically.
            Real checkout, your own brand, ready in minutes.
          </p>

          <form
            class="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
            @submit.prevent="navigateTo(adminUrl('/signup'), { external: true })"
          >
            <UInput
              v-model="handle"
              placeholder="instagram.com/yourshop"
              icon="i-lucide-at-sign"
              size="xl"
              class="flex-1"
            />
            <UButton
              type="submit"
              label="Get started"
              color="primary"
              size="xl"
              trailing-icon="i-lucide-arrow-right"
              class="justify-center whitespace-nowrap"
            />
          </form>
          <p class="mt-4 text-sm text-dimmed">Free to start · No card required · No code</p>
        </section>
      </UContainer>

      <!-- Overview: three headline benefits -->
      <UContainer>
        <section class="grid gap-6 pb-8 sm:grid-cols-3">
          <UCard v-for="f in overview" :key="f.title" variant="subtle">
            <UIcon :name="f.icon" class="size-7 text-primary" />
            <h3 class="mt-4 font-semibold text-highlighted">{{ f.title }}</h3>
            <p class="mt-2 text-sm text-muted">{{ f.summary }}</p>
          </UCard>
        </section>
      </UContainer>

      <!-- How it works -->
      <section class="border-y border-default bg-[color-mix(in_oklab,var(--ui-primary)_4%,var(--ui-bg))] py-16 sm:py-20">
        <UContainer>
          <div class="mx-auto max-w-2xl text-center">
            <p class="text-sm font-semibold uppercase tracking-wide text-primary">How it works</p>
            <h2 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted">From feed to checkout in three steps</h2>
          </div>
          <ol class="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
            <li v-for="(s, i) in steps" :key="s.title" class="relative text-center">
              <span class="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <UIcon :name="s.icon" class="size-6" />
              </span>
              <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-dimmed">Step {{ i + 1 }}</p>
              <h3 class="mt-1 text-lg font-semibold text-highlighted">{{ s.title }}</h3>
              <p class="mt-2 text-sm text-muted">{{ s.body }}</p>
            </li>
          </ol>
          <div class="mt-12 text-center">
            <UButton to="/tour" label="Take the full tour" color="neutral" variant="subtle" trailing-icon="i-lucide-arrow-right" />
          </div>
        </UContainer>
      </section>

      <!-- Buzz: press band + testimonials -->
      <UContainer class="py-16 sm:py-20">
        <div class="grid gap-4 sm:grid-cols-3">
          <figure v-for="p in PRESS" :key="p.source" class="rounded-xl border border-default p-5">
            <blockquote class="text-highlighted">“{{ p.quote }}”</blockquote>
            <figcaption class="mt-3 text-sm font-medium text-muted">— {{ p.source }}</figcaption>
          </figure>
        </div>

        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <TestimonialCard v-for="t in TESTIMONIALS.slice(0, 3)" :key="t.handle" :testimonial="t" />
        </div>
        <div class="mt-10 text-center">
          <UButton to="/customers" label="Read customer stories" color="neutral" variant="subtle" trailing-icon="i-lucide-arrow-right" />
        </div>
      </UContainer>
    </main>

    <MarketingFooter />
  </div>
</template>
