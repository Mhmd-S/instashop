<script setup lang="ts">
// Fires once when the element scrolls into view: fades + lifts its content into
// place. Latches on first visibility so it never re-hides. The reduced-motion
// guard in main.css collapses the transition to instant, and the scoped style
// below force-reveals for reduced-motion users so content is never stuck hidden.
import { useElementVisibility } from '@vueuse/core'

const props = withDefaults(defineProps<{ delay?: number }>(), { delay: 0 })

const target = ref<HTMLElement | null>(null)
const visible = useElementVisibility(target)
const revealed = ref(false)
watch(visible, (v) => { if (v) revealed.value = true })
</script>

<template>
  <div
    ref="target"
    class="reveal"
    :class="{ 'is-in': revealed }"
    :style="{ '--reveal-delay': `${props.delay}ms` }"
  >
    <slot />
  </div>
</template>

<style scoped>
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s var(--ease-soft) var(--reveal-delay, 0ms),
    transform 0.6s var(--ease-soft) var(--reveal-delay, 0ms);
  will-change: opacity, transform;
}
.reveal.is-in {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
  }
}
</style>
