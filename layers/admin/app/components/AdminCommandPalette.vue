<script setup lang="ts">
// Lightweight command palette behind the top-bar search. Jumps to any area of the
// active store, switches store, or starts a new one. Honest, keyboard-first nav —
// not a fake search box.
const open = defineModel<boolean>('open', { default: false })

const { stores, activeId, setActive } = useActiveStore()
const term = ref('')
watch(open, (v) => {
  if (v) term.value = ''
})

interface Cmd {
  id: string
  label: string
  icon: string
  group: string
  run: () => void
}

function select(fn: () => void) {
  open.value = false
  fn()
}

const commands = computed<Cmd[]>(() => {
  const sid = activeId.value
  const go = (to: string) => () => select(() => navigateTo(to))
  const list: Cmd[] = []

  if (sid) {
    list.push(
      { id: 'home', label: 'Home', icon: 'i-lucide-house', group: 'Go to', run: go('/dashboard') },
      { id: 'orders', label: 'Orders', icon: 'i-lucide-shopping-cart', group: 'Go to', run: go(`/stores/${sid}/orders`) },
      { id: 'products', label: 'Products', icon: 'i-lucide-package', group: 'Go to', run: go(`/stores/${sid}/products`) },
      { id: 'categories', label: 'Categories', icon: 'i-lucide-tags', group: 'Go to', run: go(`/stores/${sid}/categories`) },
      { id: 'payments', label: 'Payments', icon: 'i-lucide-credit-card', group: 'Go to', run: go(`/stores/${sid}/payments`) },
      { id: 'theme', label: 'Theme', icon: 'i-lucide-palette', group: 'Go to', run: go(`/stores/${sid}/theme`) },
      { id: 'branding', label: 'Branding', icon: 'i-lucide-images', group: 'Go to', run: go(`/stores/${sid}/branding`) },
      { id: 'instagram', label: 'Instagram', icon: 'i-lucide-instagram', group: 'Go to', run: go(`/stores/${sid}/instagram`) },
      { id: 'checkout', label: 'Checkout', icon: 'i-lucide-clipboard-list', group: 'Go to', run: go(`/stores/${sid}/checkout`) },
      { id: 'settings', label: 'Store settings', icon: 'i-lucide-settings', group: 'Go to', run: go(`/stores/${sid}`) },
    )
  }
  for (const s of stores.value) {
    if (s.id === activeId.value) continue
    list.push({
      id: `store-${s.id}`,
      label: `Switch to ${s.name}`,
      icon: 'i-lucide-store',
      group: 'Stores',
      run: () => select(() => {
        setActive(s.id)
        navigateTo('/dashboard')
      }),
    })
  }
  list.push({ id: 'new', label: 'New store', icon: 'i-lucide-plus', group: 'Actions', run: go('/onboarding') })
  return list
})

const filtered = computed(() => {
  const q = term.value.trim().toLowerCase()
  return q ? commands.value.filter((c) => c.label.toLowerCase().includes(q)) : commands.value
})
const groups = computed(() => {
  const map = new Map<string, Cmd[]>()
  for (const c of filtered.value) {
    const arr = map.get(c.group) ?? []
    arr.push(c)
    map.set(c.group, arr)
  }
  return [...map.entries()]
})

function onEnter() {
  filtered.value[0]?.run()
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-xl', body: 'p-0 sm:p-0' }">
    <template #content>
      <div class="overflow-hidden rounded-[calc(var(--ui-radius)*2)]">
        <div class="flex items-center gap-2.5 border-b border-default px-4">
          <UIcon name="i-lucide-search" class="size-4.5 text-ink-subtle" />
          <input
            v-model="term" autofocus type="text" placeholder="Search orders, products, settings…"
            class="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
            @keydown.enter="onEnter"
          >
          <UKbd value="esc" />
        </div>

        <div class="max-h-80 overflow-y-auto p-2">
          <p v-if="!filtered.length" class="px-2 py-6 text-center text-sm text-ink-subtle">No matches.</p>
          <div v-for="[group, items] in groups" :key="group" class="mb-1">
            <p class="px-2 py-1 text-cap font-medium uppercase tracking-[0.12em] text-ink-subtle">{{ group }}</p>
            <button
              v-for="c in items" :key="c.id"
              class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-ink transition hover:bg-primary/10 hover:text-primary"
              @click="c.run()"
            >
              <UIcon :name="c.icon" class="size-4.5 shrink-0 text-ink-subtle" />
              {{ c.label }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
