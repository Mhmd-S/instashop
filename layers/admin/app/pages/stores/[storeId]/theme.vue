<script setup lang="ts">
definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Theme</h1>
        <p class="mt-1 text-sm text-ink-muted">Customize your storefront's look — colors, fonts, layout and hero.</p>
      </div>
    </div>
    <div class="mt-6">
      <ThemeEditor :store-id="storeId" />
    </div>
  </div>
</template>
