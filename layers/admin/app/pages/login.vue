<script setup lang="ts">
definePageMeta({ surface: 'admin', layout: false })

const supabase = useSupabaseClient()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

function safeRedirect(r: unknown): string {
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/dashboard'
}

async function submit() {
  loading.value = true
  error.value = null
  const { error: e } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
  if (e) {
    error.value = e.message
    loading.value = false
    return
  }
  // Full reload so the destination renders via SSR with the just-set session cookie.
  window.location.href = safeRedirect(route.query.redirect)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-default p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-xl font-semibold text-highlighted">Sign in</h1>
        <p class="text-sm text-muted mt-1">Insteshop seller dashboard</p>
      </template>

      <form class="space-y-4" @submit.prevent="submit">
        <UFormField label="Email" name="email">
          <UInput v-model="email" type="email" placeholder="you@store.com" autocomplete="email" required class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput v-model="password" type="password" placeholder="••••••••" autocomplete="current-password" required class="w-full" />
        </UFormField>
        <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />
        <UButton type="submit" block size="lg" :loading="loading" label="Sign in" />
      </form>

      <template #footer>
        <p class="text-sm text-muted text-center">
          No account?
          <ULink to="/signup" class="text-primary font-medium">Sign up</ULink>
        </p>
      </template>
    </UCard>
  </div>
</template>
