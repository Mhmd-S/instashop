<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ surface: 'admin', layout: false })

const supabase = useSupabaseClient()

// Min 6 matches the help copy below and Supabase's default minimum; max 72 is
// bcrypt's hard limit (longer passwords are silently truncated server-side).
const schema = z.object({
  fullName: z.string().trim().min(1, 'Please enter your name').max(80, 'Name is too long'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be 72 characters or fewer'),
})
type Schema = z.output<typeof schema>

const state = reactive<{ fullName: string; email: string; password: string }>({
  fullName: '',
  email: '',
  password: '',
})
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  error.value = null
  notice.value = null
  const { data, error: e } = await supabase.auth.signUp({
    email: event.data.email,
    password: event.data.password,
    options: { data: { full_name: event.data.fullName } },
  })
  if (e) {
    error.value = e.message
    loading.value = false
    return
  }
  if (data.session) {
    window.location.href = '/onboarding'
  } else {
    notice.value = 'Check your email to confirm your account, then sign in.'
    loading.value = false
  }
}
</script>

<template>
  <AuthShell>
    <h1 class="text-h2 font-semibold text-ink">Create your account</h1>
    <p class="mt-2 text-ink-muted">Open your shop — free to start, no card required.</p>

    <UForm :schema="schema" :state="state" class="mt-8 space-y-4" @submit="onSubmit">
      <UFormField label="Name" name="fullName">
        <UInput v-model="state.fullName" size="xl" placeholder="Your name" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" size="xl" placeholder="you@store.com" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField label="Password" name="password" help="At least 6 characters">
        <UInput v-model="state.password" type="password" size="xl" placeholder="••••••••" autocomplete="new-password" class="w-full" />
      </UFormField>
      <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />
      <UAlert v-if="notice" color="info" variant="soft" :title="notice" icon="i-lucide-mail" />
      <UButton type="submit" block size="xl" :loading="loading" label="Create account" class="shadow-card" />
    </UForm>

    <p class="mt-8 text-sm text-ink-muted">
      Already have an account?
      <ULink to="/login" class="font-medium text-primary">Sign in</ULink>
    </p>
  </AuthShell>
</template>
