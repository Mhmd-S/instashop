<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ surface: 'admin', layout: false })

const supabase = useSupabaseClient()
const route = useRoute()

// Validate email shape and that a password was entered, but deliberately DON'T
// enforce a password length on sign-in: existing accounts may predate any current
// policy, and a client-side length rule here would lock valid users out.
const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type Schema = z.output<typeof schema>

const state = reactive<{ email: string; password: string }>({ email: '', password: '' })
const error = ref<string | null>(null)
const loading = ref(false)

function safeRedirect(r: unknown): string {
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/dashboard'
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = null
  const { error: e } = await supabase.auth.signInWithPassword({
    email: event.data.email,
    password: event.data.password,
  })
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
  <AuthShell>
    <h1 class="text-h2 font-semibold text-ink">Welcome back</h1>
    <p class="mt-2 text-ink-muted">Sign in to your seller dashboard.</p>

    <UForm :schema="schema" :state="state" class="mt-8 space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" size="xl" placeholder="you@store.com" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField label="Password" name="password">
        <UInput v-model="state.password" type="password" size="xl" placeholder="••••••••" autocomplete="current-password" class="w-full" />
      </UFormField>
      <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />
      <UButton type="submit" block size="xl" :loading="loading" label="Sign in" class="shadow-card" />
    </UForm>

    <p class="mt-8 text-sm text-ink-muted">
      No account?
      <ULink to="/signup" class="font-medium text-primary">Sign up</ULink>
    </p>
  </AuthShell>
</template>
