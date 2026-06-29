<script setup lang="ts">
import type { HeroSection } from '~~/shared/types/template'
import type { SectionRenderCtx } from '../../utils/sectionRegistry'

// The editorial hero: a quiet, oversized wordmark over generous space, with the
// seller's photograph doing the colour work. Four compositions (split / full-bleed /
// centered / offset) chosen by config; all share the same restrained type + hairline
// language. Degrades to a copy-only centred band when there's no image to anchor.
const props = defineProps<{ config: HeroSection; ctx: SectionRenderCtx }>()

const { logo } = useTenant()
const store = computed(() => props.ctx.store)
const imageUrl = computed(() => props.ctx.hero?.public_url ?? null)
const imageAlt = computed(() => props.ctx.hero?.caption ?? store.value?.name ?? 'Store')

const variant = computed(() => {
  const v = props.config.composition
  if ((v === 'full-bleed' || v === 'split' || v === 'offset') && !imageUrl.value) return 'centered'
  return v
})

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <!-- FULL-BLEED: the photograph fills the frame; copy rests in the lower-left over a
       soft scrim (white text stays legible on any palette). -->
  <section v-if="variant === 'full-bleed'" class="relative isolate overflow-hidden">
    <img :src="imageUrl!" :alt="imageAlt" class="absolute inset-0 -z-10 size-full object-cover">
    <div class="absolute inset-0 -z-10 bg-gradient-to-t from-black/65 via-black/20 to-black/5" aria-hidden="true" />
    <UContainer class="flex min-h-[86vh] flex-col justify-end py-16 sm:py-20">
      <div class="max-w-2xl text-white">
        <p class="text-[0.72rem] font-medium uppercase tracking-[0.24em] text-white/75">@{{ store?.subdomain }}</p>
        <h1 class="mt-5 font-heading text-5xl font-normal leading-[1.02] tracking-[-0.02em] sm:text-7xl">{{ store?.name ?? 'Store' }}</h1>
        <p class="mt-5 max-w-md text-pretty text-base text-white/80 sm:text-lg">{{ ctx.heroLine }}</p>
        <div class="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
          <button type="button" class="group inline-flex items-center gap-2 border-b border-white pb-1 text-sm font-medium tracking-wide text-white transition-all hover:gap-3" @click="scrollTo('products')">
            Shop the collection<UIcon name="i-lucide-arrow-right" class="size-4" />
          </button>
          <button v-if="config.showCategoriesCta && ctx.hasCategorySection" type="button" class="text-sm font-medium tracking-wide text-white/70 transition-colors hover:text-white" @click="scrollTo('categories')">
            Browse categories
          </button>
        </div>
      </div>
    </UContainer>
  </section>

  <!-- CENTERED (and the no-image fallback): a stacked, centred wordmark; if a photo
       exists it sits beneath as a wide editorial band. -->
  <section v-else-if="variant === 'centered'" class="py-20 sm:py-28 lg:py-32">
    <UContainer>
      <div class="mx-auto max-w-3xl text-center">
        <div v-if="logo" class="mb-8 flex justify-center"><StorefrontBrand variant="mark" size="lg" /></div>
        <p class="text-[0.72rem] font-medium uppercase tracking-[0.24em] text-muted">@{{ store?.subdomain }}</p>
        <h1 class="mt-5 font-heading text-5xl font-normal leading-[1.02] tracking-[-0.02em] text-highlighted sm:text-7xl">{{ store?.name ?? 'Store' }}</h1>
        <p class="mx-auto mt-5 max-w-md text-pretty text-base text-muted sm:text-lg">{{ ctx.heroLine }}</p>
        <div class="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <button type="button" class="group inline-flex items-center gap-2 border-b border-(--ui-text) pb-1 text-sm font-medium tracking-wide text-highlighted transition-all hover:gap-3" @click="scrollTo('products')">
            Shop the collection<UIcon name="i-lucide-arrow-right" class="size-4" />
          </button>
          <button v-if="config.showCategoriesCta && ctx.hasCategorySection" type="button" class="text-sm font-medium tracking-wide text-muted transition-colors hover:text-highlighted" @click="scrollTo('categories')">
            Browse categories
          </button>
        </div>
      </div>
      <div v-if="imageUrl" class="mt-14 overflow-hidden sm:mt-16">
        <img :src="imageUrl" :alt="imageAlt" class="aspect-[16/8] size-full object-cover">
      </div>
    </UContainer>
  </section>

  <!-- SPLIT / OFFSET: copy beside a tall photograph. OFFSET supersizes the wordmark
       and gives the image more room; both keep the image crisp and frameless. -->
  <section v-else class="py-16 sm:py-20 lg:py-24">
    <UContainer
      class="grid items-center gap-10 lg:gap-16"
      :class="variant === 'offset' ? 'lg:grid-cols-[0.9fr_1.1fr]' : 'lg:grid-cols-2'"
    >
      <div class="order-2 lg:order-1">
        <div v-if="logo" class="mb-7"><StorefrontBrand variant="mark" size="lg" /></div>
        <p class="text-[0.72rem] font-medium uppercase tracking-[0.24em] text-muted">@{{ store?.subdomain }}</p>
        <h1
          class="mt-5 font-heading font-normal leading-[1.02] tracking-[-0.02em] text-highlighted"
          :class="variant === 'offset' ? 'text-6xl sm:text-8xl' : 'text-5xl sm:text-7xl'"
        >{{ store?.name ?? 'Store' }}</h1>
        <p class="mt-6 max-w-md text-pretty text-base text-muted sm:text-lg">{{ ctx.heroLine }}</p>
        <div class="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
          <button type="button" class="group inline-flex items-center gap-2 border-b border-(--ui-text) pb-1 text-sm font-medium tracking-wide text-highlighted transition-all hover:gap-3" @click="scrollTo('products')">
            Shop the collection<UIcon name="i-lucide-arrow-right" class="size-4" />
          </button>
          <button v-if="config.showCategoriesCta && ctx.hasCategorySection" type="button" class="text-sm font-medium tracking-wide text-muted transition-colors hover:text-highlighted" @click="scrollTo('categories')">
            Browse categories
          </button>
        </div>
      </div>

      <div class="order-1 overflow-hidden lg:order-2">
        <img :src="imageUrl!" :alt="imageAlt" class="size-full object-cover" :class="variant === 'offset' ? 'aspect-[4/5] lg:aspect-[5/6]' : 'aspect-[4/5]'">
      </div>
    </UContainer>
  </section>
</template>
