<script setup lang="ts">
// Renders trusted, static HTML (blog posts, case-study bodies authored in
// layers/marketing/app/utils/marketing.ts) with marketing typography. Content is
// first-party and compiled into the bundle — never user input — so v-html is safe.
defineProps<{ html: string }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="marketing-prose text-ink-muted" v-html="html" />
</template>

<style>
.marketing-prose { line-height: 1.75; }
.marketing-prose > :first-child { margin-top: 0; }
.marketing-prose h2 { color: var(--color-ink, currentColor); font-size: 1.4rem; font-weight: 600; margin: 2.5rem 0 .7rem; letter-spacing: -0.02em; }
.marketing-prose h3 { color: var(--color-ink, currentColor); font-size: 1.1rem; font-weight: 600; margin: 1.6rem 0 .4rem; letter-spacing: -0.015em; }
.marketing-prose p { margin: .9rem 0; }
.marketing-prose ul { margin: .9rem 0; padding-left: 1.3rem; list-style: disc; }
.marketing-prose li { margin: .35rem 0; }
.marketing-prose a { color: var(--ui-primary); text-decoration: underline; text-underline-offset: 2px; }
.marketing-prose strong { color: var(--color-ink, currentColor); font-weight: 600; }
.marketing-prose blockquote { margin: 1.4rem 0; padding-left: 1.1rem; border-left: 3px solid var(--ui-primary); color: var(--color-ink, currentColor); font-style: italic; }
.marketing-prose hr { border: 0; border-top: 1px solid var(--ui-border, currentColor); margin: 2rem 0; }
</style>
