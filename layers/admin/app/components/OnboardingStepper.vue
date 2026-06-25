<script setup lang="ts">
import { ONBOARDING_STEPS, stepDone, onboardingStepUrl } from '~~/shared/onboarding/steps'
import type { OnboardingStepKey, SetupStatus } from '~~/shared/onboarding/steps'

// The onboarding progress stepper, rendered in the wizard (/onboarding). Each step
// links back to its wizard step.
const props = withDefaults(
  defineProps<{ current?: OnboardingStepKey; storeId: string; status?: SetupStatus | null }>(),
  { current: undefined, status: null },
)

// Before a store exists (the wizard's create screen) there's nothing to navigate
// to, so the steps render as a non-interactive preview rather than dead links.
const nuxtLink = resolveComponent('NuxtLink')

const currentIndex = computed(() => ONBOARDING_STEPS.findIndex((s) => s.key === props.current))

function isDone(key: OnboardingStepKey, index: number): boolean {
  // With live status use the real signal; without it (status still loading), fall
  // back to position — steps before the current one are "passed".
  return props.status ? stepDone(props.status, key) : index < currentIndex.value
}
</script>

<template>
  <ol class="flex items-center">
    <li
      v-for="(s, i) in ONBOARDING_STEPS"
      :key="s.key"
      class="flex items-center"
      :class="i < ONBOARDING_STEPS.length - 1 ? 'flex-1' : ''"
    >
      <component
        :is="storeId ? nuxtLink : 'div'"
        :to="storeId ? onboardingStepUrl(storeId, s.key) : undefined"
        class="group flex items-center gap-2 rounded-full py-1 transition"
      >
        <span
          class="grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium transition"
          :class="current === s.key
            ? 'border-primary bg-primary text-inverted'
            : isDone(s.key, i)
              ? 'border-success bg-success/10 text-success'
              : storeId
                ? 'border-default text-dimmed group-hover:border-primary'
                : 'border-default text-dimmed'"
        >
          <UIcon v-if="isDone(s.key, i) && current !== s.key" name="i-lucide-check" class="size-4" />
          <UIcon v-else :name="s.icon" class="size-4" />
        </span>
        <span class="hidden sm:inline text-sm" :class="current === s.key ? 'text-highlighted font-medium' : 'text-muted'">{{ s.label }}</span>
      </component>
      <span v-if="i < ONBOARDING_STEPS.length - 1" class="mx-2 h-px flex-1 bg-default" />
    </li>
  </ol>
</template>
