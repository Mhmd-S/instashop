<script setup lang="ts">
// The Vendly logo: an indigo rounded-square "V" mark + the wordmark. The mark uses
// `text-primary` so it tracks the app's primary colour; the wordmark inherits the
// app font (Poppins). Auto-imported app-wide from the base layer.
import { BRAND } from '~~/shared/brand'
withDefaults(defineProps<{ wordmark?: boolean }>(), { wordmark: true })
</script>

<template>
  <span class="inline-flex items-center gap-2 select-none">
    <svg viewBox="0 0 24 24" class="size-7 shrink-0 text-primary" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill="currentColor" />
      <path
        d="M6.4 8 L12 16.6 L17.6 8" fill="none" stroke="#fff"
        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"
      />
    </svg>
    <span v-if="wordmark" class="text-lg font-bold tracking-tight text-highlighted">{{ BRAND.name }}</span>
  </span>
</template>
