<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { activeId } = useActiveStore()
const { apex } = useSurfaceUrls()

async function signOut() {
  await supabase.auth.signOut()
  window.location.href = '/login'
}

const isSuperadmin = computed(
  () => (user.value?.app_metadata as { global_role?: string } | undefined)?.global_role === 'superadmin',
)

const accountItems = computed(() => [
  ...(isSuperadmin.value ? [[{ label: 'Platform', icon: 'i-lucide-settings-2', to: '/platform' }]] : []),
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut }],
])

const addItems = computed(() => [
  [
    { label: 'New store', icon: 'i-lucide-store', to: '/onboarding' },
    ...(activeId.value
      ? [{ label: 'New product', icon: 'i-lucide-package', to: `/stores/${activeId.value}/products/new` }]
      : []),
  ],
])

// Shell state
const mobileNavOpen = ref(false)
const paletteOpen = ref(false)

// ⌘K / Ctrl-K opens the command palette.
function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    paletteOpen.value = true
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="min-h-screen bg-app text-ink">
    <!-- Mobile top bar -->
    <div class="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-default bg-white/80 px-4 backdrop-blur lg:hidden">
      <UButton color="neutral" variant="ghost" icon="i-lucide-menu" aria-label="Menu" @click="mobileNavOpen = true" />
      <NuxtLink to="/dashboard" aria-label="Dashboard"><BrandLogo /></NuxtLink>
      <UButton color="neutral" variant="ghost" icon="i-lucide-search" aria-label="Search" @click="paletteOpen = true" />
    </div>

    <!-- Desktop fixed sidebar -->
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-default bg-white lg:block">
      <AdminNav />
    </aside>

    <!-- Content column -->
    <div class="lg:pl-64">
      <!-- Desktop top bar -->
      <header class="sticky top-0 z-20 hidden h-16 items-center gap-4 border-b border-default bg-white/80 px-6 backdrop-blur lg:flex">
        <button
          class="flex h-10 w-full max-w-xl items-center gap-2.5 rounded-lg bg-black/5 px-3.5 text-sm text-ink-subtle transition hover:bg-black/10"
          @click="paletteOpen = true"
        >
          <UIcon name="i-lucide-search" class="size-4.5" />
          <span class="flex-1 text-left">Search</span>
          <UKbd value="meta" />
          <UKbd value="k" />
        </button>
        <div class="ml-auto flex items-center gap-1">
          <UDropdownMenu :items="accountItems" :content="{ align: 'end' }">
            <button class="ml-1 rounded-full ring-1 ring-default transition hover:ring-primary/40">
              <UAvatar :alt="user?.email ?? 'Account'" size="sm" />
            </button>
          </UDropdownMenu>
        </div>
      </header>

      <main class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>

    <!-- Mobile nav slideover -->
    <USlideover v-model:open="mobileNavOpen" side="left" :ui="{ content: 'max-w-72' }">
      <template #content>
        <AdminNav @navigate="mobileNavOpen = false" />
      </template>
    </USlideover>

    <AdminCommandPalette v-model:open="paletteOpen" />
  </div>
</template>
