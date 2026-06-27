<script setup lang="ts">
// Page chrome for marketing content pages: shared header + footer with the page
// body in the default slot. The home page composes the same header/footer directly
// so it can run the hero full-bleed.
</script>

<template>
  <div class="flex min-h-screen flex-col bg-default text-default">
    <MarketingHeader />
    <main class="flex-1">
      <slot />
    </main>
    <MarketingFooter />
  </div>
</template>
