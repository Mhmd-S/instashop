<script setup lang="ts">
// The editorial section label: small, letter-spaced, quiet. ONE consistent treatment
// across every section (no per-mood variation) — discipline is the identity. The
// section's real content (a count, a name) does the talking; this just files it.
withDefaults(defineProps<{ align?: 'left' | 'center' }>(), { align: 'left' })
</script>

<template>
  <p
    class="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted"
    :class="align === 'center' ? 'text-center' : ''"
  >
    <slot />
  </p>
</template>
