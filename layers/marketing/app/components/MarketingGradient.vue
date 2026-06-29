<script setup lang="ts">
// Stripe-style flowing background ribbon: a blurred, masked mesh of Instagram-hued
// blobs anchored to the top-right corner, sweeping down-left behind the header and
// hero. Drifts very slowly (Stripe's "alive but never distracting" trick); the
// reduced-motion guard stops it. Purely decorative — aria-hidden.
</script>

<template>
  <div class="marketing-gradient" aria-hidden="true">
    <div class="ribbon" />
  </div>
</template>

<style scoped>
.marketing-gradient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.ribbon {
  position: absolute;
  top: -12%;
  right: -8%;
  width: 82%;
  height: 124%;
  /* Blue (top) → violet → magenta → orange → amber (bottom): Stripe's flow, IG hues */
  background:
    radial-gradient(38% 48% at 66% 6%, #8cc9f7 0%, transparent 66%),
    radial-gradient(36% 46% at 88% 22%, #8a6fe8 0%, transparent 64%),
    radial-gradient(40% 52% at 80% 44%, #d8489c 0%, transparent 62%),
    radial-gradient(48% 58% at 98% 64%, #f4773a 0%, transparent 64%),
    radial-gradient(44% 54% at 78% 88%, #f9b44b 0%, transparent 66%);
  filter: blur(58px) saturate(1.08);
  -webkit-mask-image: radial-gradient(128% 116% at 100% 2%, #000 26%, transparent 72%);
  mask-image: radial-gradient(128% 116% at 100% 2%, #000 26%, transparent 72%);
  transform: translateZ(0);
  animation: ribbonDrift 28s var(--ease-soft, ease-in-out) infinite alternate;
}
@keyframes ribbonDrift {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
  100% {
    transform: translate3d(-3%, 2.5%, 0) rotate(-4deg) scale(1.07);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ribbon {
    animation: none;
  }
}
</style>
