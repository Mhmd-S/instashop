<script setup lang="ts">
// A flowing, luminous gradient ribbon — a light, dependency-free take on Stripe's
// animated "developers" wave (no three.js). It is a dense field of fine strands that
// follow one organic flow (two sine harmonics, slowly evolving), rendered to an
// offscreen buffer and composited back as a blurred glow + a crisp top layer so the
// ribbon reads as satin light rather than scratchy hairlines. The IG palette sweeps
// warm→cool across the width and a soft highlight drifts along it.
// Purely decorative (aria-hidden). Pauses when scrolled offscreen or the tab is hidden,
// and honours prefers-reduced-motion by painting a single static frame.
import { useElementVisibility, usePreferredReducedMotion } from '@vueuse/core'

// IG stops as "r,g,b" — warm (left) → cool (right), same sweep as the numerals.
const STOPS: [number, string][] = [
  [0.0, '252,175,69'], // amber
  [0.22, '247,119,55'], // orange
  [0.46, '232,62,99'], // coral
  [0.68, '209,53,132'], // magenta
  [0.86, '161,59,180'], // violet
  [1.0, '120,72,200'], // indigo-violet
]
const STRANDS = 64

const wrap = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const visible = useElementVisibility(wrap)
const motion = usePreferredReducedMotion() // 'no-preference' | 'reduce'

let ctx: CanvasRenderingContext2D | null = null
let buf: HTMLCanvasElement | null = null
let bctx: CanvasRenderingContext2D | null = null
let grad: CanvasGradient | null = null
let raf = 0
let w = 0
let h = 0
let dpr = 1

function fit() {
  const el = canvas.value
  const box = wrap.value
  if (!el || !box) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  const r = box.getBoundingClientRect()
  w = r.width
  h = r.height
  if (!w || !h) return
  const W = Math.round(w * dpr)
  const H = Math.round(h * dpr)
  el.width = W
  el.height = H
  ctx = el.getContext('2d')
  buf = buf || document.createElement('canvas')
  buf.width = W
  buf.height = H
  bctx = buf.getContext('2d')
  if (!bctx) return
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0) // draw strands in CSS px
  // Gradient along the width; transparent ends feather the ribbon into the page.
  const g = bctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, 'rgba(252,175,69,0)')
  for (const [o, rgb] of STOPS) g.addColorStop(o * 0.86 + 0.07, `rgb(${rgb})`)
  g.addColorStop(1, 'rgba(120,72,200,0)')
  grad = g
}

const TAU = Math.PI * 2

function draw(time: number) {
  if (!ctx || !bctx || !buf || !grad) return
  const p = time * 0.00017 // flow speed
  const cy = h * 0.52
  const A1 = h * 0.16 // primary swing
  const A2 = h * 0.055 // second harmonic (organic)
  const thick = h * 0.34 // ribbon thickness
  const step = 6

  // ── strands → offscreen buffer ───────────────────────────────────────────
  bctx.clearRect(0, 0, w, h)
  bctx.lineWidth = 1
  bctx.lineCap = 'round'
  bctx.lineJoin = 'round'
  bctx.strokeStyle = grad
  for (let i = 0; i < STRANDS; i++) {
    const t = i / (STRANDS - 1)
    const c = t - 0.5 // -0.5..0.5 across thickness
    const vf = Math.exp(-((c * 2.0) ** 2)) // gaussian: bright core, soft edges
    // a slow highlight drifts along the strands over time
    const shimmer = 0.75 + 0.25 * Math.sin(t * TAU - p * 1.6)
    bctx.globalAlpha = 0.62 * vf * shimmer
    if (bctx.globalAlpha < 0.004) continue
    bctx.beginPath()
    for (let x = 0; x <= w; x += step) {
      const u = x / w
      const flow = cy
        + A1 * Math.sin(u * 1.15 * TAU + p)
        + A2 * Math.sin(u * 2.4 * TAU - p * 0.7)
      const off = c * thick + 1.4 * Math.sin(u * 4 + p * 1.3 + t * 4) // per-strand drift
      const y = flow + off
      if (x === 0) bctx.moveTo(x, y)
      else bctx.lineTo(x, y)
    }
    bctx.stroke()
  }
  bctx.globalAlpha = 1

  // ── composite: blurred glow under a crisp top layer ──────────────────────
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, buf.width, buf.height)
  ctx.filter = `blur(${Math.round(h * 0.02 * dpr)}px)`
  ctx.globalAlpha = 0.4
  ctx.drawImage(buf, 0, 0)
  ctx.filter = 'none'
  ctx.globalAlpha = 1
  ctx.drawImage(buf, 0, 0)
}

function loop(time: number) {
  draw(time)
  raf = requestAnimationFrame(loop)
}
function stop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

let ro: ResizeObserver | null = null
function sync() {
  const animate = visible.value && motion.value !== 'reduce' && !(typeof document !== 'undefined' && document.hidden)
  stop()
  if (animate) raf = requestAnimationFrame(loop)
  else if (visible.value) draw(0)
}
function onVis() { sync() }

onMounted(() => {
  fit()
  ro = new ResizeObserver(() => { fit(); sync() })
  if (wrap.value) ro.observe(wrap.value)
  document.addEventListener('visibilitychange', onVis)
  watch([visible, motion], sync, { immediate: true })
})
onBeforeUnmount(() => {
  stop()
  ro?.disconnect()
  document.removeEventListener('visibilitychange', onVis)
})
</script>

<template>
  <div ref="wrap" class="wave" aria-hidden="true">
    <canvas ref="canvas" class="block size-full" />
  </div>
</template>

<style scoped>
.wave {
  line-height: 0;
}
</style>
