<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

async function signOut() {
  await supabase.auth.signOut()
  window.location.href = '/login'
}

// Platform settings are SaaS-owner-only — surface the entry just to superadmins.
const isSuperadmin = computed(() => (user.value?.app_metadata as { global_role?: string } | undefined)?.global_role === 'superadmin')

const menuItems = computed(() => [
  ...(isSuperadmin.value
    ? [[{ label: 'Platform', icon: 'i-lucide-settings-2', to: '/platform' }]]
    : []),
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut }],
])
</script>

<template>
  <div class="min-h-screen bg-default text-default">
    <header class="border-b border-default bg-default/75 backdrop-blur sticky top-0 z-50">
      <UContainer class="h-14 flex items-center justify-between">
        <ULink to="/dashboard" aria-label="Dashboard"><BrandLogo /></ULink>
        <UDropdownMenu :items="menuItems">
          <UButton
            color="neutral"
            variant="ghost"
            :label="user?.email ?? 'Account'"
            icon="i-lucide-circle-user"
            trailing-icon="i-lucide-chevron-down"
          />
        </UDropdownMenu>
      </UContainer>
    </header>
    <UContainer class="py-8">
      <slot />
    </UContainer>
  </div>
</template>
