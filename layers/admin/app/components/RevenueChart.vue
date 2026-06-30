<script setup lang="ts">
import { formatPrice } from '~~/shared/types/product'

const props = defineProps<{
  series: { date: string; grossMinor: number; orders: number }[]
  currency: string
}>()

// viewBox space — the SVG scales to the container width while keeping this aspect.
const W = 720
const H = 200
const PAD_X = 6
const PAD_T = 14
const PAD_B = 8

const max = computed(() => Math.max(1, ...props.series.map((s) => s.grossMinor)))
const hasData = computed(() => props.series.some((s) => s.grossMinor > 0))

const points = computed(() => {
  const n = props.series.length
  if (!n) return [] as { x: number; y: number; date: string; grossMinor: number; orders: number }[]
  const innerW = W - PAD_X * 2
  const innerH = H - PAD_T - PAD_B
  return props.series.map((s, i) => ({
    x: PAD_X + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW),
    y: PAD_T + innerH - (s.grossMinor / max.value) * innerH,
    date: s.date,
    grossMinor: s.grossMinor,
    orders: s.orders,
  }))
})

const linePath = computed(() =>
  points.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
)
const areaPath = computed(() => {
  const pts = points.value
  if (!pts.length) return ''
  const base = H - PAD_B
  return `${linePath.value} L${pts[pts.length - 1]!.x.toFixed(1)} ${base} L${pts[0]!.x.toFixed(1)} ${base} Z`
})

// Hover — map the pointer's horizontal position to the nearest data point.
const hover = ref<number | null>(null)
function onMove(e: PointerEvent) {
  const n = points.value.length
  if (!n) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  hover.value = Math.round(ratio * (n - 1))
}
const active = computed(() => (hover.value == null ? null : points.value[hover.value] ?? null))

function shortDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
</script>

<template>
  <div class="relative select-none" @pointermove="onMove" @pointerleave="hover = null">
    <div v-if="!hasData" class="grid h-40 place-items-center">
      <div class="text-center">
        <UIcon name="i-lucide-chart-area" class="mx-auto size-7 text-ink-subtle" />
        <p class="mt-2 text-sm text-ink-subtle">No revenue in this period yet</p>
      </div>
    </div>
    <template v-else>
    <svg :viewBox="`0 0 ${W} ${H}`" class="block h-auto w-full overflow-visible" role="img" aria-label="Revenue over time">
      <defs>
        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--ui-primary)" stop-opacity="0.16" />
          <stop offset="100%" stop-color="var(--ui-primary)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- baseline -->
      <line :x1="PAD_X" :x2="W - PAD_X" :y1="H - PAD_B" :y2="H - PAD_B" stroke="var(--ui-border)" stroke-width="1" />

      <path v-if="hasData" :d="areaPath" fill="url(#revFill)" />
      <path
        :d="linePath" fill="none" stroke="var(--ui-primary)" stroke-width="2"
        stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"
      />

      <!-- hover guide + marker -->
      <template v-if="active">
        <line
          :x1="active.x" :x2="active.x" :y1="PAD_T - 6" :y2="H - PAD_B"
          stroke="var(--ui-border)" stroke-width="1" stroke-dasharray="3 3"
        />
        <circle :cx="active.x" :cy="active.y" r="4" fill="var(--ui-primary)" stroke="white" stroke-width="1.5" />
      </template>
      <circle
        v-else-if="points.length"
        :cx="points[points.length - 1]!.x" :cy="points[points.length - 1]!.y"
        r="3.5" fill="var(--ui-primary)"
      />
    </svg>

    <!-- tooltip -->
    <div
      v-if="active"
      class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-1 rounded-lg border border-default bg-default px-2.5 py-1.5 text-center shadow-lg"
      :style="{ left: `${(active.x / W) * 100}%` }"
    >
      <p class="text-sm font-semibold text-highlighted tabular-nums">{{ formatPrice(active.grossMinor, currency) }}</p>
      <p class="text-xs text-muted">{{ shortDate(active.date) }} · {{ active.orders }} order{{ active.orders === 1 ? '' : 's' }}</p>
    </div>

    <div class="mt-2 flex justify-between text-xs text-ink-subtle">
      <span>{{ series.length ? shortDate(series[0]!.date) : '' }}</span>
      <span>{{ series.length ? shortDate(series[series.length - 1]!.date) : '' }}</span>
    </div>
    </template>
  </div>
</template>
