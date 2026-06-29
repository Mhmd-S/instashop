<script setup lang="ts">
// Shared footer for the marketing surface: a CTA strip + sitemap columns.
import { BRAND } from '~~/shared/brand'

// `cta` (default true) renders the closing CTA strip. The home page sets it false
// because it already ends with its own immersive gradient CTA band.
withDefaults(defineProps<{ cta?: boolean }>(), { cta: true })

const { adminUrl } = useSurfaceUrls()
const year = 2026 // Date.now() is unavailable in this sandbox; brand copyright year.

const columns: { title: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', to: '/' },
      { label: 'Tour', to: '/tour' },
      { label: 'Screenshots', to: '/screenshots' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Manifesto', to: '/manifesto' },
      { label: 'Customers', to: '/customers' },
      { label: 'Blog', to: '/blog' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Sign up', to: adminUrl('/signup'), external: true },
      { label: 'Log in', to: adminUrl('/login'), external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
      { label: 'Data deletion', to: '/data-deletion' },
    ],
  },
]
</script>

<template>
  <footer class="border-t border-default bg-[color-mix(in_oklab,var(--ui-primary)_4%,var(--ui-bg))]">
    <UContainer class="py-14">
      <!-- Closing CTA -->
      <div v-if="cta" class="mb-12 flex flex-col items-start justify-between gap-5 rounded-2xl border border-default bg-default p-8 sm:flex-row sm:items-center">
        <div>
          <h2 class="text-xl font-semibold text-highlighted">{{ BRAND.tagline }}</h2>
          <p class="mt-1 text-sm text-muted">Connect your account and open your shop in minutes — free to start.</p>
        </div>
        <UButton
          :to="adminUrl('/signup')"
          external
          label="Get started"
          color="primary"
          size="lg"
          trailing-icon="i-lucide-arrow-right"
          class="shrink-0"
        />
      </div>

      <div class="grid grid-cols-2 gap-8 sm:grid-cols-4">
        <div v-for="col in columns" :key="col.title">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-dimmed">{{ col.title }}</h3>
          <ul class="mt-3 space-y-2 text-sm">
            <li v-for="link in col.links" :key="link.label">
              <NuxtLink :to="link.to" :external="link.external" class="text-muted hover:text-highlighted">
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="mt-12 flex flex-col gap-3 border-t border-default pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <NuxtLink to="/" aria-label="Home"><BrandLogo /></NuxtLink>
        <span>© {{ year }} {{ BRAND.name }}. All rights reserved.</span>
      </div>
    </UContainer>
  </footer>
</template>
