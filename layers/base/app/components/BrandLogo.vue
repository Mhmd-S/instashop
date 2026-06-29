<script setup lang="ts">
// The Chanis logo: an indigo rounded-square "C" mark + the wordmark. The mark uses
// `text-primary` so it tracks the app's primary colour; the wordmark inherits the
// app font (Poppins). Auto-imported app-wide from the base layer.
import { BRAND } from '~~/shared/brand'
// `inverted` swaps the wordmark to white for use on dark surfaces (e.g. the auth
// brand panel); the mark stays primary-coloured, which reads on light or dark.
withDefaults(defineProps<{ wordmark?: boolean, inverted?: boolean }>(), { wordmark: true, inverted: false })
</script>

<template>
  <span class="inline-flex items-center gap-2 select-none">
    <svg viewBox="0 0 24 24" class="size-7 shrink-0 text-primary" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill="currentColor" />
      <path
        d="M16 7.2 A6.2 6.2 0 1 0 16 16.8" fill="none" stroke="#fff"
        stroke-width="2.5" stroke-linecap="round"
      />
    </svg>
    <span v-if="wordmark" class="text-lg font-bold tracking-tight" :class="inverted ? 'text-white' : 'text-highlighted'">{{ BRAND.name }}</span>
  </span>
</template>
