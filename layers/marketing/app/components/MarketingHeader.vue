<script setup lang="ts">
// Sticky top nav shared by every marketing page. Primary links come from
// MARKETING_NAV; the auth CTAs cross over to the admin host.
import type { DropdownMenuItem } from '@nuxt/ui'

const { adminUrl } = useSurfaceUrls()
const route = useRoute()

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
  <header class="sticky top-0 z-20 border-b border-default bg-default/80 backdrop-blur">
    <UContainer class="flex h-16 items-center justify-between gap-4">
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
          :class="isActive(item.to) ? 'text-highlighted' : 'text-muted'"
        />
      </nav>

      <div class="flex items-center gap-2">
        <UButton
          :to="adminUrl('/login')"
          external
          label="Log in"
          color="neutral"
          variant="ghost"
          size="sm"
          class="hidden sm:inline-flex"
        />
        <UButton :to="adminUrl('/signup')" external label="Sign up" color="primary" size="sm" />
        <UDropdownMenu :items="menuItems" :ui="{ content: 'w-48' }" class="lg:hidden">
          <UButton icon="i-lucide-menu" color="neutral" variant="ghost" size="sm" aria-label="Menu" />
        </UDropdownMenu>
      </div>
    </UContainer>
  </header>
</template>
