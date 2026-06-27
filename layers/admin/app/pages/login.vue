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
  <div class="min-h-screen flex items-center justify-center bg-default p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <BrandLogo class="mb-3" />
        <h1 class="text-xl font-semibold text-highlighted">Sign in</h1>
        <p class="text-sm text-muted mt-1">Seller dashboard</p>
      </template>

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" placeholder="you@store.com" autocomplete="email" class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput v-model="state.password" type="password" placeholder="••••••••" autocomplete="current-password" class="w-full" />
        </UFormField>
        <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />
        <UButton type="submit" block size="lg" :loading="loading" label="Sign in" />
      </UForm>

      <template #footer>
        <p class="text-sm text-muted text-center">
          No account?
          <ULink to="/signup" class="text-primary font-medium">Sign up</ULink>
        </p>
      </template>
    </UCard>
  </div>
</template>
