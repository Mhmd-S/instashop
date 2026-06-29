<script setup lang="ts">
// The store's brand presence: its logo (from the active theme) rendered tastefully
// next to / instead of the wordmark. Logos vary wildly, so the treatment adapts:
//   • transparent art  → a designed logo/wordmark; show it on its own (name in alt)
//   • opaque art        → an avatar (e.g. IG profile picture); frame it in a thin
//                         hairline ring and pair it with the wordmark
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
        ? (size === 'lg' ? 'h-12 max-w-[14rem]' : 'h-9 max-w-[11rem]') + ' w-auto object-contain'
        : (size === 'lg' ? 'size-14' : 'size-11') + ' rounded-full object-cover ring-1 ring-(--t-rule-strong)'
    "
  >

  <!-- Logo + wordmark lockup — header & footer. -->
  <span v-else-if="variant === 'lockup'" class="inline-flex min-w-0 items-center gap-2.5">
    <img
      v-if="logo && logo.transparent"
      :src="logo.url"
      :alt="name"
      class="w-auto max-w-[13rem] object-contain"
      :class="size === 'lg' ? 'h-9 sm:h-10' : 'h-7 sm:h-8'"
    >
    <template v-else>
      <img
        v-if="logo"
        :src="logo.url"
        :alt="name"
        class="shrink-0 rounded-full object-cover ring-1 ring-(--t-rule-strong)"
        :class="size === 'lg' ? 'size-10' : 'size-8'"
      >
      <span
        class="truncate font-heading font-medium tracking-[-0.01em] text-highlighted"
        :class="size === 'lg' ? 'text-xl sm:text-2xl' : 'text-lg'"
      >{{ name }}</span>
    </template>
  </span>
</template>
