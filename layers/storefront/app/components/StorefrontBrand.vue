<script setup lang="ts">
// The store's brand presence: its logo (from the active theme) rendered tastefully
// next to / instead of the wordmark. Logos vary wildly, so the treatment adapts:
//   • transparent art  → a designed logo/wordmark; show it on its own (name in alt)
//   • opaque art        → an avatar (e.g. IG profile picture); frame it in a circle
//                         and pair it with the wordmark so the name still reads
// `variant="mark"` shows just the logo (for the hero, where the headline is the name)
// and renders nothing when the store has no logo.
withDefaults(defineProps<{ variant?: 'lockup' | 'mark'; size?: 'sm' | 'lg' }>(), {
  variant: 'lockup',
  size: 'sm',
})

const { store, logo } = useTenant()
const name = computed(() => store.value?.name ?? 'Store')
</script>

<template>
  <!-- Bare logo mark — used in the hero, where the <h1> already carries the name. -->
  <img
    v-if="variant === 'mark' && logo"
    :src="logo.url"
    :alt="name"
    loading="eager"
    :class="
      logo.transparent
        ? (size === 'lg' ? 'h-14 max-w-[16rem]' : 'h-10 max-w-[12rem]') + ' w-auto object-contain'
        : (size === 'lg' ? 'size-16 rounded-2xl' : 'size-12 rounded-xl') + ' object-cover shadow-[var(--t-shadow)] ring-1 ring-default/60'
    "
  >

  <!-- Logo + wordmark lockup — header & footer. -->
  <span v-else-if="variant === 'lockup'" class="inline-flex min-w-0 items-center gap-2.5">
    <img
      v-if="logo && logo.transparent"
      :src="logo.url"
      :alt="name"
      class="w-auto max-w-[14rem] object-contain"
      :class="size === 'lg' ? 'h-11 sm:h-12' : 'h-8 sm:h-9'"
    >
    <template v-else>
      <img
        v-if="logo"
        :src="logo.url"
        :alt="name"
        class="shrink-0 rounded-full object-cover ring-1 ring-default/60"
        :class="size === 'lg' ? 'size-11' : 'size-8'"
      >
      <span
        class="truncate font-heading font-semibold tracking-tight text-highlighted"
        :class="size === 'lg' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'"
      >{{ name }}</span>
    </template>
  </span>
</template>
