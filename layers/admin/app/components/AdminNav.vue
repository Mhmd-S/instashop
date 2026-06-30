<script setup lang="ts">
// The admin sidebar — Stripe-style: account switcher up top, flat top-level items,
// then collapsible labelled groups. Active items read in the brand indigo; the store
// switcher carries the signature IG-gradient mark. Rendered in the fixed desktop rail
// and inside the mobile slideover (which listens to `navigate` to close).
const emit = defineEmits<{ navigate: [] }>()

const { stores, activeId, active, setActive } = useActiveStore()
const { storeUrl } = useSurfaceUrls()
const route = useRoute()

const sid = computed(() => activeId.value)

interface Item {
  label: string
  icon: string
  to: string
  exact?: boolean
}

const overview = computed<Item[]>(() => [
  { label: 'Home', icon: 'i-lucide-house', to: '/dashboard', exact: true },
])
const groups = computed<{ id: string; label: string; items: Item[] }[]>(() =>
  sid.value
    ? [
        {
          id: 'store',
          label: 'Store',
          items: [
            { label: 'Orders', icon: 'i-lucide-shopping-cart', to: `/stores/${sid.value}/orders` },
            { label: 'Products', icon: 'i-lucide-package', to: `/stores/${sid.value}/products` },
            { label: 'Categories', icon: 'i-lucide-tags', to: `/stores/${sid.value}/categories` },
            { label: 'Payments', icon: 'i-lucide-credit-card', to: `/stores/${sid.value}/payments` },
          ],
        },
        {
          id: 'storefront',
          label: 'Storefront',
          items: [
            { label: 'Theme', icon: 'i-lucide-palette', to: `/stores/${sid.value}/theme` },
            { label: 'Branding', icon: 'i-lucide-images', to: `/stores/${sid.value}/branding` },
            { label: 'Instagram', icon: 'i-lucide-instagram', to: `/stores/${sid.value}/instagram` },
            { label: 'Checkout', icon: 'i-lucide-clipboard-list', to: `/stores/${sid.value}/checkout` },
          ],
        },
      ]
    : [],
)

const collapsed = reactive<Record<string, boolean>>({})
function toggle(id: string) {
  collapsed[id] = !collapsed[id]
}

function isActive(item: Item) {
  const p = route.path
  return item.exact ? p === item.to : p === item.to || p.startsWith(`${item.to}/`)
}

// Store switcher dropdown — switch context (return Home) or create a new store.
const switcherItems = computed(() => [
  stores.value.map((s) => ({
    label: s.name,
    icon: s.id === activeId.value ? 'i-lucide-check' : 'i-lucide-store',
    onSelect: () => {
      setActive(s.id)
      navigateTo('/dashboard')
      emit('navigate')
    },
  })),
  [{ label: 'New store', icon: 'i-lucide-plus', to: '/onboarding' }],
])

const initial = computed(() => (active.value?.name?.[0] ?? '·').toUpperCase())
const linkClass = (on: boolean) =>
  on ? 'text-primary' : 'text-ink-muted hover:bg-black/5 hover:text-ink'
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Store switcher (top, Stripe account-switcher slot) -->
    <div class="p-3">
      <UDropdownMenu
        v-if="active"
        :items="switcherItems"
        :content="{ align: 'start' }"
        :ui="{ content: 'min-w-56' }"
      >
        <button
          class="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-black/5"
        >
          <span
            class="grid size-8 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white"
            :style="{ background: 'var(--gradient-ig)' }"
          >{{ initial }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-ink">{{ active.name }}</span>
            <span class="block truncate text-xs text-ink-subtle">{{ active.subdomain }}</span>
          </span>
          <UIcon name="i-lucide-chevrons-up-down" class="size-4 shrink-0 text-ink-subtle" />
        </button>
      </UDropdownMenu>
      <UButton
        v-else
        to="/onboarding" block icon="i-lucide-plus" label="Create your store"
        @click="emit('navigate')"
      />
    </div>

    <!-- Nav -->
    <nav class="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
      <div class="space-y-0.5">
        <NuxtLink
          v-for="item in overview" :key="item.to" :to="item.to"
          class="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition"
          :class="linkClass(isActive(item))"
          @click="emit('navigate')"
        >
          <UIcon :name="item.icon" class="size-5 shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </div>

      <div v-for="g in groups" :key="g.id">
        <button
          class="flex w-full items-center justify-between rounded-md px-2.5 py-1 text-[0.8125rem] font-medium text-ink-subtle transition hover:text-ink-muted"
          @click="toggle(g.id)"
        >
          {{ g.label }}
          <UIcon
            name="i-lucide-chevron-down" class="size-3.5 transition-transform"
            :class="{ '-rotate-90': collapsed[g.id] }"
          />
        </button>
        <div v-show="!collapsed[g.id]" class="mt-0.5 space-y-0.5">
          <NuxtLink
            v-for="item in g.items" :key="item.to" :to="item.to"
            class="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition"
            :class="linkClass(isActive(item))"
            @click="emit('navigate')"
          >
            <UIcon :name="item.icon" class="size-5 shrink-0" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Footer -->
    <div v-if="active" class="space-y-0.5 border-t border-default p-3">
      <NuxtLink
        :to="`/stores/${sid}`"
        class="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition"
        :class="linkClass(route.path === `/stores/${sid}`)"
        @click="emit('navigate')"
      >
        <UIcon name="i-lucide-settings" class="size-5 shrink-0" />
        Store settings
      </NuxtLink>
      <a
        :href="storeUrl(active.subdomain)" target="_blank" rel="noopener"
        class="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-muted transition hover:bg-black/5 hover:text-ink"
      >
        <UIcon name="i-lucide-external-link" class="size-5 shrink-0" />
        View storefront
      </a>
    </div>
  </div>
</template>
