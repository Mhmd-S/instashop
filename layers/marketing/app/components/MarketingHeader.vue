<script setup lang="ts">
// Sticky top nav shared by every marketing page. Transparent over the hero gradient,
// solidifying to a frosted bar once scrolled (Stripe's header behaviour). Primary
// links come from MARKETING_NAV; the auth CTAs cross over to the admin host.
import type { DropdownMenuItem } from '@nuxt/ui'
import { useWindowScroll } from '@vueuse/core'

const { adminUrl } = useSurfaceUrls()
const route = useRoute()

const { y } = useWindowScroll()
const scrolled = computed(() => y.value > 8)

const isActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`)

// Mobile: the same links collapse into a dropdown menu.
const menuItems = computed<DropdownMenuItem[][]>(() => [
  MARKETING_NAV.map((item) => ({ label: item.label, icon: item.icon, to: item.to })),
  [
    { label: 'Log in', icon: 'i-lucide-log-in', to: adminUrl('/login'), target: '_self' },
    { label: 'Sign up', icon: 'i-lucide-user-plus', to: adminUrl('/signup'), target: '_self' },
  ],
])
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b transition-colors duration-300"
    :class="scrolled
      ? 'border-default bg-page/80 backdrop-blur'
      : 'border-transparent bg-transparent'"
  >
    <UContainer class="flex h-16 items-center justify-between gap-4 lg:h-18">
      <NuxtLink to="/" aria-label="Home" class="shrink-0"><BrandLogo /></NuxtLink>

      <nav class="hidden items-center gap-1 lg:flex">
        <UButton
          v-for="item in MARKETING_NAV"
          :key="item.to"
          :to="item.to"
          :label="item.label"
          color="neutral"
          variant="ghost"
          size="sm"
          class="font-medium"
          :class="isActive(item.to) ? 'text-ink' : 'text-ink-muted hover:text-ink'"
        />
      </nav>

      <div class="flex items-center gap-2">
        <UButton
          :to="adminUrl('/login')"
          external
          label="Log in"
          color="neutral"
          variant="ghost"
          size="md"
          class="hidden px-4 py-2 min-h-11 font-medium text-primary ring-1 ring-default bg-white/70 hover:bg-white hover:text-primary sm:inline-flex"
        />
        <UButton
          :to="adminUrl('/signup')"
          external
          label="Sign up"
          color="primary"
          size="md"
          class="px-4 py-2 min-h-11 font-medium shadow-card"
        />
        <UDropdownMenu :items="menuItems" :ui="{ content: 'w-48' }" class="lg:hidden">
          <UButton icon="i-lucide-menu" color="neutral" variant="ghost" size="sm" aria-label="Menu" class="size-11 justify-center" />
        </UDropdownMenu>
      </div>
    </UContainer>
  </header>
</template>
