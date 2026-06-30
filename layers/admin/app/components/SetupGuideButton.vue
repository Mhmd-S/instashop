<script setup lang="ts">
// The Stripe "Setup guide" pill with a circular progress ring. Progress is real —
// derived from the store's setup-status — and the button hides once setup is complete.
const { activeId } = useActiveStore()

interface SetupStatus {
  steps: {
    instagram: { done: boolean }
    theme: { done: boolean }
    products: { done: boolean }
    branding: { done: boolean }
    payments: { done: boolean }
  }
}

const { data } = await useAsyncData<SetupStatus | null>(
  'setup-status',
  () => (activeId.value ? $fetch<SetupStatus>(`/api/admin/stores/${activeId.value}/setup-status`) : Promise.resolve(null)),
  { watch: [activeId] },
)

const pct = computed(() => {
  const s = data.value?.steps
  if (!s) return 0
  const flags = [s.instagram.done, s.theme.done, s.products.done, s.branding.done, s.payments.done]
  return Math.round((flags.filter(Boolean).length / flags.length) * 100)
})

// Ring geometry (r=8 → circumference ≈ 50.27).
const C = 2 * Math.PI * 8
const dashOffset = computed(() => C * (1 - pct.value / 100))
</script>

<template>
  <NuxtLink
    v-if="activeId && pct < 100"
    :to="`/onboarding?store=${activeId}`"
    class="flex items-center gap-2 rounded-full border border-default bg-white py-1.5 pl-2 pr-3.5 text-sm font-medium text-ink shadow-card transition duration-200 ease-stripe hover:-translate-y-px hover:shadow-float"
  >
    <svg viewBox="0 0 20 20" class="size-5 -rotate-90">
      <circle cx="10" cy="10" r="8" fill="none" stroke="var(--ui-border)" stroke-width="2.5" />
      <circle
        cx="10" cy="10" r="8" fill="none" stroke="var(--ui-primary)" stroke-width="2.5"
        stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="dashOffset"
      />
    </svg>
    Setup guide
  </NuxtLink>
</template>
