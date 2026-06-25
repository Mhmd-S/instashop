<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const isStoreNotFound = computed(
  () => (props.error?.data as { code?: string } | undefined)?.code === 'STORE_NOT_FOUND',
)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-default text-default">
    <UCard class="w-full max-w-md text-center">
      <div class="flex justify-center">
        <BrandLogo />
      </div>

      <UIcon
        :name="isStoreNotFound ? 'i-lucide-store' : 'i-lucide-triangle-alert'"
        class="size-12 mx-auto mt-6 text-dimmed"
      />

      <h1 class="mt-4 text-5xl font-semibold text-highlighted">{{ error.statusCode }}</h1>
      <p class="mt-3 text-muted">
        <template v-if="isStoreNotFound">This store doesn’t exist (yet).</template>
        <template v-else>{{ error.statusMessage || 'Something went wrong.' }}</template>
      </p>

      <UButton
        class="mt-8 justify-center"
        block
        size="lg"
        color="primary"
        label="Go home"
        icon="i-lucide-arrow-left"
        @click="clearError({ redirect: '/' })"
      />
    </UCard>
  </div>
</template>
