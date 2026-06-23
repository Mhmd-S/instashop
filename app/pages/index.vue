<script setup lang="ts">
// '/' renders marketing (apex) or the storefront home (store host). The admin host
// never reaches '/' — the surface guard redirects it to /dashboard.
const { surface, store } = useTenant()
</script>

<template>
  <MarketingHome v-if="surface === 'marketing'" />
  <StorefrontHome v-else-if="surface === 'store'" :store="store" />
  <div v-else class="min-h-screen bg-bg" />
</template>
