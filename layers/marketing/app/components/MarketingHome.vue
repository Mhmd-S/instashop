<script setup lang="ts">
import { BRAND } from '~~/shared/brand'

const { adminUrl } = useSurfaceUrls()
const handle = ref('')
const submit = () => navigateTo(adminUrl('/signup'), { external: true })

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

// Three headline features, each paired with a real product-UI mock (the rest live
// on the tour). `kind` selects the FeatureMock surface shown beside the copy.
const kinds = ['import', 'brand', 'checkout'] as const
const features = FEATURES.slice(0, 3).map((f, i) => ({ ...f, kind: kinds[i]! }))

const steps = [
  { icon: 'i-lucide-instagram', time: '30 seconds', title: 'Connect', body: "Link Instagram in two taps and we'll pull in your posts." },
  { icon: 'i-lucide-mouse-pointer-click', time: '2 minutes', title: 'Review', body: 'Our AI finds the products in your posts and adds them to your site for you — you just review and tweak.' },
  { icon: 'i-lucide-rocket', time: 'One click', title: 'Sell', body: 'Publish, share one link, and take card payments from order one.' },
]
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-page text-ink">
    <MarketingHeader />

    <main class="relative z-10 flex-1">
      <!-- Hero: Stripe-style two-column — flush-left copy, and the generated storefront
           demo floating on the weaved-gradient stage on the right. -->
      <section class="relative overflow-hidden">
        <UContainer class="relative">
          <div class="grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-12 lg:py-24">
            <!-- Copy -->
            <div class="relative z-10 max-w-xl">
              <span class="inline-flex items-center gap-2 rounded-full border border-default bg-white px-3 py-1 text-cap font-medium uppercase tracking-[0.08em] text-ink-subtle">
                <span class="size-1.5 rounded-full" :style="{ background: 'var(--gradient-ig)' }" />
                Instagram → storefront
              </span>

              <h1 class="mt-6 text-[clamp(2.5rem,4.6vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
                Turn your Instagram into a
                <span class="text-ink-subtle">website.</span>
              </h1>

              <p class="mt-6 max-w-[42ch] text-[clamp(1.125rem,1.4vw,1.375rem)] leading-[1.55] text-ink-muted">
                Paste your page — we turn your posts into products and match your vibe automatically.
                Real checkout, your own brand, ready in minutes.
              </p>

              <form class="mt-9 flex max-w-md flex-col gap-3 sm:flex-row" @submit.prevent="submit">
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
                  class="justify-center whitespace-nowrap shadow-card transition duration-200 ease-stripe hover:-translate-y-px hover:shadow-float"
                />
              </form>
              <p class="mt-4 text-cap text-ink-subtle">Free to start · No card required · No code</p>
            </div>

            <!-- Demo: the generated storefront on the weaved-gradient stage -->
            <MarketingHeroDemo class="w-full lg:-mr-2" />
          </div>
        </UContainer>
      </section>

      <!-- See it live: the generated storefront floating on a gradient stage, ringed by
           callout cards (the Stripe "in action" product shot). -->
      <MarketingShowcase
        bg="/landing/purple-home.jpg"
        eyebrow="See it live"
        title="Not a link in bio — a storefront that's yours"
        lead="Every shop is a fast, branded website with real checkout, generated from your feed and ready to share."
      />

      <!-- How it works: a light, Stripe-grade beat. The gradient survives as a flowing
           wave (animated canvas) + three hue-stepped numerals — never a wash behind copy. -->
      <section class="bg-page py-12 lg:py-24">
        <UContainer>
          <div>
            <!-- editorial header, centered, two-tone (matches the showcase section headers) -->
            <Reveal>
              <div class="mx-auto max-w-2xl text-center">
                <p class="text-cap font-medium uppercase tracking-[0.12em] text-ink-subtle">How it works</p>
                <h2 class="mt-3 text-h2 font-semibold text-ink text-balance">
                  From feed to checkout
                  <span class="text-ink-subtle">in minutes.</span>
                </h2>
                <p class="mx-auto mt-4 max-w-xl text-lead text-ink-muted">
                  Three steps, start to first sale — no code, no waiting on a designer.
                </p>
              </div>
            </Reveal>

            <!-- desktop: the three numerals ride ON the flowing wave; details sit beneath -->
            <div class="mt-8 hidden sm:block lg:mt-10">
              <!-- numerals row, with the wave flowing through them (behind) -->
              <div class="relative">
                <MarketingWave class="pointer-events-none absolute inset-x-0 top-1/2 h-52 -translate-y-1/2 lg:h-60" />
                <ol class="relative z-10 grid grid-cols-3 gap-x-10">
                  <Reveal v-for="(s, i) in steps" :key="s.title" :delay="i * 110" as="li">
                    <span
                      class="block font-semibold leading-none tracking-tight tabular-nums text-ink"
                      :style="{ fontSize: 'clamp(3.5rem, 7vw, 5rem)' }"
                    >0{{ i + 1 }}</span>
                  </Reveal>
                </ol>
              </div>
              <!-- details row, aligned under each numeral -->
              <ol class="mt-6 grid grid-cols-3 gap-x-10">
                <Reveal v-for="(s, i) in steps" :key="s.title" :delay="i * 110 + 140" as="li">
                  <div class="flex items-center gap-3">
                    <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10">
                      <UIcon :name="s.icon" class="size-4 text-primary" />
                    </span>
                    <h3 class="text-h3 font-semibold text-ink">{{ s.title }}</h3>
                  </div>
                  <p class="mt-3 text-cap font-medium uppercase tracking-[0.08em] text-ink-subtle tabular-nums">{{ s.time }}</p>
                  <p class="mt-3 max-w-[34ch] text-ink-muted leading-relaxed">{{ s.body }}</p>
                </Reveal>
              </ol>
            </div>

            <!-- mobile: stacked, joined by a vertical gradient thread -->
            <ol class="relative mt-8 space-y-9 sm:hidden">
              <span
                class="absolute bottom-6 left-[1.05rem] top-6 w-px opacity-60"
                :style="{ background: 'var(--gradient-ig)' }"
                aria-hidden="true"
              />
              <Reveal v-for="(s, i) in steps" :key="s.title" :delay="i * 90" as="li" class="relative flex gap-5">
                <span class="relative z-10 shrink-0 text-5xl font-semibold leading-none tabular-nums text-ink">0{{ i + 1 }}</span>
                <div>
                  <div class="flex items-center gap-2.5">
                    <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10">
                      <UIcon :name="s.icon" class="size-4 text-primary" />
                    </span>
                    <h3 class="text-h3 font-semibold text-ink">{{ s.title }}</h3>
                  </div>
                  <p class="mt-2 text-cap font-medium uppercase tracking-[0.08em] text-ink-subtle tabular-nums">{{ s.time }}</p>
                  <p class="mt-2 text-ink-muted leading-relaxed">{{ s.body }}</p>
                </div>
              </Reveal>
            </ol>
          </div>
        </UContainer>
      </section>

      <!-- Run the shop: the seller dashboard floating on the orange gradient stage. -->
      <MarketingShowcase
        bg="/landing/stringy-orange.jpg"
        variant="dashboard"
        eyebrow="Run the shop"
        title="And manage it all from one dashboard"
        lead="Orders, customers and payouts in a single place — so you spend less time on admin and more on making."
        :callouts="[
          { icon: 'i-lucide-package', title: 'Orders in one place', body: 'Every sale with the buyer and fulfilment status.' },
          { icon: 'i-lucide-wallet', title: 'Paid out to you', body: 'Funds settle to your own Stripe — no marketplace cut.' },
          { icon: 'i-lucide-line-chart', title: 'Know your numbers', body: 'Revenue and orders at a glance the moment you sign in.' },
        ]"
      />

      <!-- Closing CTA: the page's final gradient moment, on the same gradient-image stage
           as the showcase sections — but the signup copy + form float on it in place of a
           product window. The neon-twirl backdrop (a luminous ribbon on black) keeps this
           the home's one dark beat. -->
      <section class="pb-20 lg:pb-28">
        <UContainer>
          <Reveal :delay="80">
            <div class="stage relative isolate overflow-hidden rounded-mock bg-immersion px-6 py-20 text-center shadow-float sm:px-10 lg:py-28">
              <!-- neon-twirl backdrop + a soft center scrim so the copy reads crisply while
                   the ribbon glows around the frame edges. -->
              <div class="absolute inset-0 -z-10 overflow-hidden rounded-mock" aria-hidden="true">
                <img src="/landing/twirl-neon.jpeg" alt="" class="size-full object-cover">
                <div
                  class="absolute inset-0"
                  style="background: radial-gradient(75% 82% at 50% 50%, rgba(17,8,34,0.86), rgba(17,8,34,0.46) 60%, rgba(17,8,34,0.12) 100%)"
                />
                <!-- re-darken the lower band: on the wide desktop crop the ribbon's lower
                     lobe re-enters where the radial scrim has faded, so the trust line keeps
                     its contrast while the neon still glows around the upper edges. -->
                <div
                  class="absolute inset-0"
                  style="background: linear-gradient(to bottom, transparent 70%, rgba(17,8,34,0.65))"
                />
              </div>

              <h2 class="mx-auto max-w-xl text-hero font-semibold text-white text-balance">
                Your shop is
                <span class="text-white/60">one paste away.</span>
              </h2>
              <p class="mx-auto mt-5 max-w-xl text-lead text-white/80">
                Connect your account and open your shop in minutes — free to start.
              </p>
              <form class="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row" @submit.prevent="submit">
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
                  class="justify-center whitespace-nowrap shadow-float transition duration-200 ease-stripe hover:-translate-y-px"
                />
              </form>
              <p class="mt-4 text-cap text-white/75">Free to start · No card required · No code</p>
            </div>
          </Reveal>
        </UContainer>
      </section>
    </main>

    <MarketingFooter :cta="false" />
  </div>
</template>
