<script setup lang="ts">
// Hero demo: ONE browser frame whose photos physically reflow between two layouts — the
// seller's Instagram feed (3-col, flush) and the storefront we generate (2-col, titled +
// priced) — then back, on a slow loop. The SAME six photos travel: posts become products
// and settle into cards, names + prices fade in, the address bar swaps instagram.com ⇄ the
// .chanis.app domain, and a "from @<handle>" chip rides the storefront state. The motion is
// a real FLIP (measure First + Last rects, invert, play) so photos glide between exact slots.
//
// Fallback: the frame RESTS on the storefront (default `mode`), so the server-rendered HTML,
// a no-JS client, a FLIP failure, or prefers-reduced-motion all show the finished shop — the
// payoff — never a half-built state. JS enhances by rewinding to the feed and looping.
//
// Why in-place: the hero column is half the screen — one frame only — so the IG→site story is
// told by transforming that frame, not by mashing a second card beside it.
import { useElementVisibility } from '@vueuse/core'

interface Tile { image: string; name: string; price: string; cardOrder: number }

// Six posts that become six products — same photos, two layouts. DOM order = the Instagram
// feed (3-col); `cardOrder` = where each lands in the storefront grid (2-col), so the reflow
// genuinely rearranges rather than just resizing in place.
const tiles: Tile[] = [
  { image: '/marketing/sage-mug.jpg',     name: 'Stoneware mug',   price: '£38.00', cardOrder: 0 },
  { image: '/marketing/sage-studio.jpg',  name: 'Stoneware set',   price: '£72.00', cardOrder: 5 },
  { image: '/marketing/sage-bowls.jpg',   name: 'Serving bowls',   price: '£56.00', cardOrder: 1 },
  { image: '/marketing/sage-planter.jpg', name: 'Hanging planter', price: '£52.00', cardOrder: 4 },
  { image: '/marketing/sage-vases.jpg',   name: 'Bud vase',        price: '£44.00', cardOrder: 2 },
  { image: '/marketing/sage-plates.jpg',  name: 'Dinner plates',   price: '£48.00', cardOrder: 3 },
]

const shop = MOCK_SHOP

const root = ref<HTMLElement | null>(null)
const visible = useElementVisibility(root)
const settled = ref(false)
// Default = the storefront: this is what renders on the server and persists if JS / motion
// is unavailable. JS rewinds to 'feed' and cycles.
const mode = ref<'feed' | 'cards'>('cards')

// One ref per photo wrapper, by index, so FLIP can measure each before/after the switch.
const photoEls = ref<HTMLElement[]>([])
const setPhotoRef = (el: Element | null, i: number) => { if (el) photoEls.value[i] = el as HTMLElement }

const prefersReduced = import.meta.client
  && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// FLIP: record where each photo is, switch layout, then play it from old → new. Any failure
// degrades to a plain layout swap (the new state still shows, just without the glide).
async function flipTo(next: 'feed' | 'cards') {
  const els = photoEls.value.filter(Boolean)
  if (prefersReduced || !els.length) { mode.value = next; return }
  try {
    const first = els.map(el => el.getBoundingClientRect())
    mode.value = next
    await nextTick()
    els.forEach((el, i) => {
      const last = el.getBoundingClientRect()
      if (!last.width) return
      const dx = first[i]!.left - last.left
      const dy = first[i]!.top - last.top
      const s = first[i]!.width / last.width
      el.style.transition = 'none'
      el.style.transformOrigin = 'top left'
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`
    })
    // Two frames later, release the inversion so each photo glides to its real slot.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      els.forEach((el, i) => {
        el.style.transition = `transform 0.9s var(--ease-soft) ${i * 40}ms`
        el.style.transform = ''
      })
    }))
  } catch {
    mode.value = next // never let a measurement error break the page
  }
}

// Slow loop: dwell on each state so it reads as a transform, not a flicker.
let timer: ReturnType<typeof setTimeout> | undefined
function loop() {
  const hold = mode.value === 'feed' ? 2600 : 3600
  timer = setTimeout(async () => {
    await flipTo(mode.value === 'feed' ? 'cards' : 'feed')
    loop()
  }, hold)
}

watch(visible, (v) => {
  if (!v || settled.value) return
  settled.value = true
  if (prefersReduced) return // rest on the storefront (default), no loop
  // A beat on the finished shop (the fallback state), then reveal the Instagram origin and cycle.
  timer = setTimeout(async () => { await flipTo('feed'); loop() }, 800)
})
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <div
    ref="root"
    class="stage relative isolate rounded-mock p-4 shadow-float sm:p-6"
    :class="{ 'is-settled': settled }"
  >
    <!-- Weaved-gradient backdrop + a soft edge scrim so the white window reads crisply. -->
    <div class="absolute inset-0 -z-10 overflow-hidden rounded-mock" aria-hidden="true">
      <img src="/landing/weaved-hero.jpg" alt="" class="size-full object-cover">
      <div
        class="absolute inset-0"
        style="background: radial-gradient(120% 95% at 50% 18%, transparent 38%, rgba(24,12,46,0.30))"
      />
    </div>

    <!-- The frame: Instagram feed ⇄ generated storefront, the photos reflowing between. -->
    <div class="frame relative overflow-hidden rounded-mock border border-white/25 bg-white shadow-mockup">
      <!-- Browser chrome — the address bar carries the story (instagram ⇄ chanis). -->
      <div class="flex items-center gap-1.5 border-b border-default bg-page px-3.5 py-2.5">
        <span class="size-2.5 rounded-full bg-red-400/70" />
        <span class="size-2.5 rounded-full bg-amber-400/70" />
        <span class="size-2.5 rounded-full bg-green-400/70" />

        <div class="addr relative ml-3 hidden h-5 w-44 sm:block">
          <span
            class="addr-line absolute inset-0 flex items-center gap-1.5 truncate rounded bg-white px-2 text-xs text-ink-subtle ring-1 ring-default"
            :class="{ 'is-on': mode === 'feed' }"
          >
            <UIcon name="i-lucide-instagram" class="size-3 shrink-0 text-ink-subtle" />
            <span class="truncate">instagram.com/{{ shop.handle }}</span>
          </span>
          <span
            class="addr-line absolute inset-0 flex items-center gap-1.5 truncate rounded bg-white px-2 text-xs text-ink-subtle ring-1 ring-default"
            :class="{ 'is-on': mode === 'cards' }"
          >
            <UIcon name="i-lucide-lock" class="size-3 shrink-0 text-green-600/70" />
            <span class="truncate">{{ shop.domain }}</span>
          </span>
        </div>

        <span class="prov ml-auto hidden items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[0.62rem] font-medium text-ink-subtle sm:flex" :class="{ 'is-on': mode === 'cards' }">
          <span class="size-1.5 rounded-full" :style="{ background: 'var(--gradient-ig)' }" />
          from @{{ shop.handle }}
        </span>
      </div>

      <!-- Content: a fixed-height stage so the frame doesn't jump as layouts swap. The two
           headers overlay at the top and crossfade; the photo deck sits below each. -->
      <div class="relative h-104 overflow-hidden bg-white">
        <!-- Storefront header (cards) -->
        <div class="head" :class="{ 'is-on': mode === 'cards' }">
          <div class="flex items-center justify-between px-5 pt-4 pb-3">
            <span class="store-name text-[1rem] font-medium tracking-[-0.01em] text-ink">{{ shop.name }}</span>
            <span class="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-ink-subtle">Bag</span>
          </div>
          <div class="flex items-center gap-4 overflow-hidden border-y border-default px-5 py-2">
            <span
              v-for="(n, i) in shop.nav"
              :key="n"
              class="whitespace-nowrap text-[0.58rem] font-medium uppercase tracking-[0.16em]"
              :class="i === 0 ? 'border-b border-ink pb-px text-ink' : 'text-ink-subtle'"
            >{{ n }}</span>
          </div>
        </div>

        <!-- Instagram profile header (feed) — avatar, stats, bio, profile tabs. -->
        <div class="head" :class="{ 'is-on': mode === 'feed' }">
          <div class="flex items-start gap-4 px-5 pt-4">
            <span class="grid size-16 shrink-0 place-items-center rounded-full p-0.5" :style="{ background: 'var(--gradient-ig)' }">
              <span class="grid size-full place-items-center rounded-full bg-white text-lg font-semibold text-ink">S</span>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-ink">{{ shop.handle }}</span>
                <span class="rounded-md bg-[#0095f6] px-2.5 py-0.5 text-[0.6rem] font-semibold text-white">Following</span>
                <span class="rounded-md bg-page px-2 py-0.5 text-[0.6rem] font-semibold text-ink ring-1 ring-default">Message</span>
                <UIcon name="i-lucide-ellipsis" class="ml-auto size-4 text-ink-subtle" />
              </div>
              <div class="mt-2 flex gap-5 text-[0.72rem]">
                <span><span class="font-semibold text-ink tabular-nums">{{ shop.ig.posts }}</span> <span class="text-ink-subtle">posts</span></span>
                <span><span class="font-semibold text-ink tabular-nums">{{ shop.ig.followers }}</span> <span class="text-ink-subtle">followers</span></span>
                <span><span class="font-semibold text-ink tabular-nums">{{ shop.ig.following }}</span> <span class="text-ink-subtle">following</span></span>
              </div>
              <div class="mt-1.5 leading-snug">
                <p class="text-[0.74rem] font-semibold text-ink">{{ shop.name }}</p>
                <p class="text-[0.7rem] text-ink-subtle">{{ shop.tagline }} 🏺</p>
                <p class="text-[0.7rem] font-medium text-ink-subtle">{{ shop.domain }}</p>
              </div>
            </div>
          </div>
          <!-- Profile tabs: Posts active, like the real grid header -->
          <div class="mt-3 flex items-center justify-center gap-10 border-t border-default text-[0.55rem] font-semibold uppercase tracking-[0.14em]">
            <span class="-mt-px flex items-center gap-1 border-t border-ink py-2 text-ink">
              <UIcon name="i-lucide-grid-3x3" class="size-3" /> Posts
            </span>
            <span class="flex items-center gap-1 py-2 text-ink-subtle">
              <UIcon name="i-lucide-clapperboard" class="size-3" /> Reels
            </span>
            <span class="flex items-center gap-1 py-2 text-ink-subtle">
              <UIcon name="i-lucide-user-round" class="size-3" /> Tagged
            </span>
          </div>
        </div>

        <!-- Photo deck: the same six photos, reflowing between feed grid and product grid.
             Its top sits below whichever header is showing (the IG profile is taller). -->
        <div
          class="absolute inset-x-0 bottom-0 overflow-hidden mask-[linear-gradient(to_bottom,#000_84%,transparent)]"
          :class="mode === 'feed' ? 'top-44' : 'top-19'"
        >
          <div
            class="grid"
            :class="mode === 'feed' ? 'grid-cols-3 gap-0.5 p-0.5' : 'grid-cols-2 gap-x-3.5 gap-y-4 px-5 pt-3'"
          >
            <div
              v-for="(t, i) in tiles"
              :key="t.image"
              class="tile"
              :style="mode === 'cards' ? { order: t.cardOrder } : undefined"
            >
              <div
                :ref="(el) => setPhotoRef(el as Element | null, i)"
                class="photo aspect-square overflow-hidden bg-page"
                :class="mode === 'cards' ? 'rounded-sm' : ''"
              >
                <img :src="t.image" :alt="t.name" loading="eager" class="size-full object-cover">
              </div>
              <div class="meta leading-tight" :class="{ 'is-on': mode === 'cards' }">
                <p class="truncate text-[0.74rem] text-ink">{{ t.name }}</p>
                <p class="text-[0.74rem] text-ink-subtle tabular-nums">{{ t.price }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  perspective: 1800px;
}
/* The editorial serif wordmark the storefront generates (apex has no tenant heading
   font, so opt into a system serif just for the mock store name). */
.store-name {
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
}

/* The frame tilts in on first view, then settles flat. */
.frame {
  transform: rotateY(-7deg) rotateX(4deg);
  transition: transform 0.85s var(--ease-soft);
  will-change: transform;
}
.stage.is-settled .frame {
  transform: none;
}

/* Address bar + provenance: crossfade with the current layout. */
.addr-line,
.prov {
  opacity: 0;
  transition: opacity 0.6s var(--ease-soft);
  pointer-events: none;
}
.addr-line.is-on,
.prov.is-on {
  opacity: 1;
}

/* The two headers occupy the same top slot and crossfade. */
.head {
  position: absolute;
  inset-inline: 0;
  top: 0;
  opacity: 0;
  transition: opacity 0.6s var(--ease-soft);
  pointer-events: none;
}
.head.is-on {
  opacity: 1;
  pointer-events: auto;
}

/* The photo's transform is driven imperatively by the FLIP (no CSS transition here). */
.tile {
  position: relative;
}
.photo {
  will-change: transform;
}

/* Product name + price: absent from the feed layout (so tiles stay square + flush),
   fading in only as cards. */
.meta {
  position: absolute;
  inset-inline: 0;
  opacity: 0;
  transition: opacity 0.5s var(--ease-soft) 0.25s;
  pointer-events: none;
}
.meta.is-on {
  position: static;
  margin-top: 0.5rem;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .frame {
    transform: none;
    transition: none;
  }
  .addr-line,
  .prov,
  .head,
  .meta {
    transition: none;
  }
}
</style>
