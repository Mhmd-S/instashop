<script setup lang="ts">
import type { NewsletterSection } from '~~/shared/types/template'
import { resolveCopy } from '~~/shared/template/copy'
import type { SectionRenderCtx } from '../../utils/sectionRegistry'

// A quiet sign-up filed on a single underline — email left, "Subscribe" right. Phase 1
// renders the band; capture (table + endpoint) lands in Phase 3, so submit shows a
// local confirmation and stores nothing yet.
const props = defineProps<{ config: NewsletterSection; ctx: SectionRenderCtx }>()
const copy = computed(() => resolveCopy(props.config.copySlot, props.ctx.store?.name))

const email = ref('')
const done = ref(false)
function onSubmit() {
  // TODO(P3): POST /api/storefront/subscribe once newsletter_signups exists.
  if (!email.value.trim()) return
  done.value = true
}
</script>

<template>
  <section class="border-t border-(--t-rule) bg-(--t-paper-2) py-20 sm:py-28">
    <UContainer>
      <Reveal>
        <div class="mx-auto max-w-xl text-center">
          <StorefrontEyebrow align="center">{{ copy.eyebrow }}</StorefrontEyebrow>
          <h2 class="mt-3 font-heading text-2xl font-normal tracking-[-0.01em] text-highlighted sm:text-3xl">
            {{ copy.heading }}
          </h2>
          <p class="mx-auto mt-3 max-w-sm text-pretty text-sm text-muted sm:text-base">
            Be first to know about new arrivals and restocks.
          </p>

          <form v-if="!done" class="mx-auto mt-9 flex max-w-md items-center gap-4 border-b border-(--ui-text) pb-2.5" @submit.prevent="onSubmit">
            <input
              v-model="email"
              type="email"
              required
              placeholder="Email address"
              aria-label="Email address"
              class="min-w-0 flex-1 bg-transparent text-sm text-highlighted placeholder:text-muted/60 focus:outline-none"
            >
            <button type="submit" class="group inline-flex shrink-0 items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-highlighted transition-all hover:gap-3">
              Subscribe<UIcon name="i-lucide-arrow-right" class="size-3.5" />
            </button>
          </form>
          <p v-else class="mx-auto mt-9 text-sm text-muted">Thank you — we’ll be in touch.</p>
        </div>
      </Reveal>
    </UContainer>
  </section>
</template>
