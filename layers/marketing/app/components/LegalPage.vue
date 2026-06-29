<script setup lang="ts">
// Shared chrome + typography for the public legal pages (/privacy, /terms,
// /data-deletion). Authors pass a title; the body is plain semantic HTML in the
// default slot, styled by the `.legal-prose` rules below. Header/footer come from
// the shared marketing shell so the legal pages match the rest of the apex site.
defineProps<{ title: string; updated?: string }>()
</script>

<template>
  <MarketingShell>
    <UContainer class="py-12 sm:py-16">
      <div class="mx-auto max-w-3xl">
        <h1 class="text-h2 font-semibold text-ink sm:text-hero">{{ title }}</h1>
        <p v-if="updated" class="mt-2 text-sm text-ink-subtle">Last updated: {{ updated }}</p>
        <div class="legal-prose mt-8 text-ink-muted">
          <slot />
        </div>
      </div>
    </UContainer>
  </MarketingShell>
</template>

<style>
/* Keyed under .legal-prose so these globals only affect the legal pages. Falls back
   gracefully if a Nuxt UI text token is unavailable. */
.legal-prose { line-height: 1.7; }
.legal-prose h2 { color: var(--color-ink, currentColor); font-size: 1.2rem; font-weight: 600; margin: 2.25rem 0 .6rem; letter-spacing: -0.015em; }
.legal-prose h3 { color: var(--color-ink, currentColor); font-size: 1rem; font-weight: 600; margin: 1.4rem 0 .4rem; }
.legal-prose p { margin: .7rem 0; }
.legal-prose ul { margin: .7rem 0; padding-left: 1.3rem; list-style: disc; }
.legal-prose li { margin: .3rem 0; }
.legal-prose a { color: var(--ui-primary); text-decoration: underline; text-underline-offset: 2px; }
.legal-prose strong { color: var(--color-ink, currentColor); font-weight: 600; }
.legal-prose hr { border: 0; border-top: 1px solid var(--ui-border, currentColor); margin: 1.6rem 0; }
.legal-prose code { font-size: .9em; padding: .1em .35em; border-radius: .3em; background: color-mix(in oklab, var(--ui-primary) 10%, transparent); }
</style>
