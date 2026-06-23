<script setup lang="ts">
const { adminUrl } = useSurfaceUrls()
const handle = ref('')
</script>

<template>
  <main class="min-h-screen bg-default text-default">
    <header class="border-b border-default bg-default/80 backdrop-blur sticky top-0 z-10">
      <UContainer class="py-4 flex items-center justify-between">
        <span class="flex items-center gap-2 text-lg font-semibold text-highlighted">
          <UIcon name="i-lucide-shopping-bag" class="size-6 text-primary" />
          Insteshop
        </span>
        <nav class="flex items-center gap-2">
          <UButton :to="adminUrl('/login')" external label="Log in" color="neutral" variant="ghost" size="sm" />
          <UButton :to="adminUrl('/signup')" external label="Sign up" color="primary" variant="solid" size="sm" />
        </nav>
      </UContainer>
    </header>

    <UContainer>
      <section class="max-w-3xl mx-auto py-24 sm:py-32 text-center">
        <UBadge
          color="primary"
          variant="subtle"
          label="Instagram to storefront in minutes"
          icon="i-lucide-instagram"
          size="lg"
          class="mb-6"
        />
        <h1 class="text-4xl sm:text-6xl font-semibold tracking-tight text-highlighted text-balance">
          Turn your Instagram into a shop.
        </h1>
        <p class="mt-6 text-lg text-muted max-w-xl mx-auto text-balance">
          Paste your page — we import your posts as products and match your vibe automatically.
        </p>

        <form
          class="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
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

        <p class="mt-4 text-xs text-dimmed">surface: marketing (apex)</p>
      </section>

      <section class="grid gap-6 sm:grid-cols-3 pb-24">
        <UCard variant="subtle">
          <UIcon name="i-lucide-download" class="size-7 text-primary" />
          <h3 class="mt-4 font-semibold text-highlighted">Import your posts</h3>
          <p class="mt-2 text-sm text-muted">We pull your Instagram posts and turn each one into a product.</p>
        </UCard>
        <UCard variant="subtle">
          <UIcon name="i-lucide-palette" class="size-7 text-primary" />
          <h3 class="mt-4 font-semibold text-highlighted">Match your vibe</h3>
          <p class="mt-2 text-sm text-muted">Colors and fonts are detected automatically to fit your brand.</p>
        </UCard>
        <UCard variant="subtle">
          <UIcon name="i-lucide-shopping-cart" class="size-7 text-primary" />
          <h3 class="mt-4 font-semibold text-highlighted">Start selling</h3>
          <p class="mt-2 text-sm text-muted">Share your storefront link and accept orders right away.</p>
        </UCard>
      </section>
    </UContainer>
  </main>
</template>
