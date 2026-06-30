<script setup lang="ts">
// The "Today" intraday timeline from the Stripe design: a solid accent segment up to
// the current time, the remainder dashed, bookended by 12:00 AM labels. Client-only
// (time-dependent) so it never trips an SSR hydration mismatch.
const frac = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

function tick() {
  const d = new Date()
  frac.value = (d.getHours() * 60 + d.getMinutes()) / 1440
}
onMounted(() => {
  tick()
  timer = setInterval(tick, 60_000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <ClientOnly>
    <div>
      <div class="relative h-3">
        <!-- dashed remainder -->
        <div class="absolute inset-x-0 top-1/2 border-t border-dashed border-ink/20" />
        <!-- solid progress -->
        <div class="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-primary" :style="{ width: `${frac * 100}%` }" />
        <!-- now marker -->
        <div
          class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white"
          :style="{ left: `${frac * 100}%` }"
        />
      </div>
      <div class="mt-2 flex justify-between text-xs text-ink-subtle">
        <span>12:00 AM</span>
        <span>12:00 AM</span>
      </div>
    </div>
  </ClientOnly>
</template>
