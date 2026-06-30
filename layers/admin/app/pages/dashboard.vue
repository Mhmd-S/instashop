<script setup lang="ts">
import { formatPrice } from '~~/shared/types/product'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const { stores, activeId, active } = useActiveStore()

// Brand-new users have no store yet — force them straight into onboarding rather than
// showing a dead-end welcome. Awaiting the (shared, keyed) fetch guarantees the list is
// resolved before we decide, so this never misfires for users who *do* have stores.
await useFetch('/api/admin/stores', { key: 'admin-stores' })
if (!stores.value.length) {
  await navigateTo('/onboarding')
}

// Date range drives the aggregation window.
const days = ref(7)
const rangeItems = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]
const rangeLabel = computed(() => rangeItems.find((r) => r.value === days.value)?.label ?? '')
const rangeMenu = computed(() => [rangeItems.map((r) => ({ label: r.label, onSelect: () => (days.value = r.value) }))])

// "Compare to previous period" toggle (mirrors the Stripe overview control).
const compare = ref(true)

interface Metrics {
  currency: string
  days: number
  summary: {
    grossMinor: number
    ordersCount: number
    aovMinor: number
    pendingMinor: number
    todayMinor: number
    yesterdayMinor: number
    prevGrossMinor: number
    prevOrdersCount: number
    prevAovMinor: number
  }
  series: { date: string; grossMinor: number; orders: number }[]
  recent: {
    id: string
    order_number: string
    total_minor: number
    currency: string
    payment_status: string
    status: string
    contact_name: string | null
    contact_email: string | null
    placed_at: string
  }[]
}

const { data: metrics } = await useAsyncData<Metrics | null>(
  'dashboard-metrics',
  () =>
    activeId.value
      ? $fetch<Metrics>(`/api/admin/stores/${activeId.value}/metrics`, { query: { days: days.value } })
      : Promise.resolve(null),
  { watch: [activeId, days] },
)

const cur = computed(() => metrics.value?.currency ?? active.value?.base_currency ?? 'USD')
function money(minor: number | undefined) {
  return formatPrice(minor ?? 0, cur.value)
}
const sum = computed(() => metrics.value?.summary)
const todayOrders = computed(() => {
  const s = metrics.value?.series
  return s?.length ? s[s.length - 1]!.orders : 0
})

// Local time stamp under "Gross volume", client-only to avoid hydration drift.
const nowLabel = ref('')
onMounted(() => {
  nowLabel.value = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
})

function pctDelta(now: number, prev: number) {
  if (!prev) return now > 0 ? 100 : 0
  return Math.round(((now - prev) / prev) * 100)
}

const cards = computed(() => {
  const s = sum.value
  return [
    { label: 'Gross volume', value: money(s?.grossMinor), prev: money(s?.prevGrossMinor), delta: pctDelta(s?.grossMinor ?? 0, s?.prevGrossMinor ?? 0) },
    { label: 'Orders', value: String(s?.ordersCount ?? 0), prev: String(s?.prevOrdersCount ?? 0), delta: pctDelta(s?.ordersCount ?? 0, s?.prevOrdersCount ?? 0) },
    { label: 'Avg. order value', value: money(s?.aovMinor), prev: money(s?.prevAovMinor), delta: pctDelta(s?.aovMinor ?? 0, s?.prevAovMinor ?? 0) },
    { label: 'Pending payment', value: money(s?.pendingMinor), prev: null as string | null, delta: null as number | null },
  ]
})

function pill(s: string) {
  if (s === 'paid') return 'bg-emerald-100 text-emerald-700'
  if (s === 'pending' || s === 'unpaid') return 'bg-amber-100 text-amber-700'
  if (s === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-ink/10 text-ink-muted'
}
</script>

<template>
  <div>
    <!-- Empty state: a guided welcome that launches the setup wizard. -->
    <div v-if="!stores.length" class="mx-auto max-w-2xl py-8 text-center">
      <div class="mx-auto mb-5 grid size-14 place-items-center rounded-2xl text-white shadow-float" :style="{ background: 'var(--gradient-ig)' }">
        <UIcon name="i-lucide-sparkles" class="size-7" />
      </div>
      <h1 class="text-hero font-semibold text-ink text-balance">Turn your Instagram into a store</h1>
      <p class="mt-3 text-lead text-ink-muted">
        Connect your account, customize the look, and launch a shoppable storefront in minutes.
      </p>
      <UButton to="/onboarding" size="lg" class="mt-6 shadow-card" icon="i-lucide-plus" label="Get started" />

      <div class="mt-10 grid gap-4 text-left sm:grid-cols-3">
        <div class="rounded-card border border-default bg-white p-5 shadow-card">
          <span class="grid size-9 place-items-center rounded-lg bg-primary/10"><UIcon name="i-lucide-instagram" class="size-5 text-primary" /></span>
          <p class="mt-3 font-semibold text-ink">Import posts</p>
          <p class="mt-0.5 text-sm text-ink-muted">AI turns your Instagram posts into draft products.</p>
        </div>
        <div class="rounded-card border border-default bg-white p-5 shadow-card">
          <span class="grid size-9 place-items-center rounded-lg bg-primary/10"><UIcon name="i-lucide-palette" class="size-5 text-primary" /></span>
          <p class="mt-3 font-semibold text-ink">Customize</p>
          <p class="mt-0.5 text-sm text-ink-muted">A theme, palette and hero derived from your brand.</p>
        </div>
        <div class="rounded-card border border-default bg-white p-5 shadow-card">
          <span class="grid size-9 place-items-center rounded-lg bg-primary/10"><UIcon name="i-lucide-rocket" class="size-5 text-primary" /></span>
          <p class="mt-3 font-semibold text-ink">Launch</p>
          <p class="mt-0.5 text-sm text-ink-muted">Preview, then share your live storefront link.</p>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- ── Today ─────────────────────────────────────────────────────── -->
      <h1 class="text-3xl font-bold tracking-tight text-ink">Today</h1>
      <hr class="mt-4 border-default">

      <div class="mt-6 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <!-- left -->
        <div>
          <div class="flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <p class="text-sm text-ink-muted">Gross volume</p>
              <p class="mt-1 text-3xl font-bold tabular-nums text-ink">{{ money(sum?.todayMinor) }}</p>
              <p v-if="nowLabel" class="mt-1 text-xs text-ink-subtle">{{ nowLabel }}</p>
            </div>
            <div>
              <p class="text-sm text-ink-muted">Yesterday</p>
              <p class="mt-1 text-3xl font-bold tabular-nums text-ink">{{ money(sum?.yesterdayMinor) }}</p>
            </div>
          </div>
          <div class="mt-10"><TodayTimeline /></div>
        </div>

        <!-- right rail -->
        <div class="space-y-4 lg:border-l lg:border-default lg:pl-8">
          <div>
            <div class="flex items-center justify-between">
              <p class="text-sm text-ink-muted">Pending payment</p>
              <NuxtLink :to="`/stores/${activeId}/orders`" class="text-sm font-medium text-primary hover:underline">View</NuxtLink>
            </div>
            <p class="mt-1 text-2xl font-bold tabular-nums text-ink">{{ money(sum?.pendingMinor) }}</p>
          </div>
          <hr class="border-default">
          <div>
            <p class="text-sm text-ink-muted">Orders today</p>
            <p class="mt-1 text-2xl font-bold tabular-nums text-ink">{{ todayOrders }}</p>
          </div>
        </div>
      </div>

      <!-- ── Your overview ─────────────────────────────────────────────── -->
      <h2 class="mt-12 text-2xl font-bold tracking-tight text-ink">Your overview</h2>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <UDropdownMenu :items="rangeMenu" :content="{ align: 'start' }">
          <button class="inline-flex items-center rounded-md border border-default bg-white px-2.5 py-1.5 text-sm transition hover:bg-black/5">
            <span class="text-ink-subtle">Date range</span>
            <span class="mx-2 h-3.5 w-px bg-default" />
            <span class="font-medium text-ink">{{ rangeLabel }}</span>
            <UIcon name="i-lucide-chevron-down" class="ml-1 size-4 text-ink-subtle" />
          </button>
        </UDropdownMenu>
        <span class="inline-flex items-center rounded-md border border-default bg-white px-2.5 py-1.5 text-sm font-medium text-ink">Daily</span>
        <button
          class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition"
          :class="compare ? 'border-primary/40 bg-primary/10 text-primary' : 'border-default bg-white text-ink-muted hover:bg-black/5'"
          @click="compare = !compare"
        >
          <UIcon :name="compare ? 'i-lucide-x' : 'i-lucide-plus'" class="size-3.5" />
          Compare<span class="mx-1 h-3.5 w-px" :class="compare ? 'bg-primary/30' : 'bg-default'" /><span :class="compare ? 'font-medium' : ''">Previous period</span>
        </button>
      </div>

      <!-- metric tiles -->
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="c in cards" :key="c.label" class="rounded-xl border border-default bg-white p-4">
          <div class="flex items-center gap-1.5">
            <p class="text-sm text-ink-muted">{{ c.label }}</p>
            <UIcon name="i-lucide-info" class="size-3.5 text-ink-subtle" />
          </div>
          <p class="mt-2 text-2xl font-bold tabular-nums text-ink">{{ c.value }}</p>
          <p v-if="compare && c.prev !== null" class="mt-1 flex items-center gap-1.5 text-xs text-ink-subtle">
            <span
              v-if="c.delta !== null && c.delta !== 0"
              class="inline-flex items-center gap-0.5 font-medium"
              :class="c.delta > 0 ? 'text-emerald-600' : 'text-red-600'"
            >
              <UIcon :name="c.delta > 0 ? 'i-lucide-arrow-up-right' : 'i-lucide-arrow-down-right'" class="size-3" />{{ Math.abs(c.delta) }}%
            </span>
            <span>{{ c.prev }} previous period</span>
          </p>
          <p v-else class="mt-1 text-xs text-ink-subtle">&nbsp;</p>
        </div>
      </div>

      <!-- chart -->
      <div class="mt-4 rounded-xl border border-default bg-white p-5 sm:p-6">
        <div class="mb-4 flex items-center justify-between">
          <p class="font-semibold text-ink">Gross volume</p>
          <p class="text-sm font-semibold tabular-nums text-ink">{{ money(sum?.grossMinor) }}</p>
        </div>
        <RevenueChart :series="metrics?.series ?? []" :currency="cur" />
      </div>

      <!-- recent orders -->
      <div class="mt-4 overflow-hidden rounded-xl border border-default bg-white">
        <div class="flex items-center justify-between border-b border-default px-5 py-4">
          <p class="font-semibold text-ink">Recent orders</p>
          <UButton
            :to="`/stores/${activeId}/orders`" size="xs" variant="link" color="neutral"
            trailing-icon="i-lucide-arrow-right" label="View all"
          />
        </div>

        <div v-if="!metrics?.recent.length" class="py-12 text-center">
          <UIcon name="i-lucide-shopping-cart" class="mx-auto size-8 text-ink-subtle" />
          <p class="mt-2 text-sm text-ink-muted">No orders yet.</p>
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-default text-left text-cap uppercase tracking-widest text-ink-subtle">
              <th class="px-5 py-2.5 font-medium">Order</th>
              <th class="px-5 py-2.5 font-medium">Customer</th>
              <th class="px-5 py-2.5 font-medium">Total</th>
              <th class="px-5 py-2.5 font-medium">Payment</th>
              <th class="px-5 py-2.5 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in metrics.recent" :key="o.id" class="border-b border-default transition last:border-0 hover:bg-black/5">
              <td class="px-5 py-3">
                <NuxtLink :to="`/stores/${activeId}/orders/${o.id}`" class="font-medium text-ink hover:text-primary">{{ o.order_number }}</NuxtLink>
              </td>
              <td class="px-5 py-3 text-ink-muted">{{ o.contact_name || o.contact_email || '—' }}</td>
              <td class="px-5 py-3 tabular-nums text-ink">{{ formatPrice(o.total_minor, o.currency) }}</td>
              <td class="px-5 py-3">
                <span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize" :class="pill(o.payment_status)">{{ o.payment_status }}</span>
              </td>
              <td class="px-5 py-3 text-ink-subtle">{{ o.placed_at.slice(0, 10) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
