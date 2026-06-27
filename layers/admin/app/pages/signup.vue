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
  <div class="min-h-screen flex items-center justify-center bg-default p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <BrandLogo class="mb-3" />
        <h1 class="text-xl font-semibold text-highlighted">Create your account</h1>
        <p class="text-sm text-muted mt-1">Start your store</p>
      </template>

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="fullName">
          <UInput v-model="state.fullName" placeholder="Your name" autocomplete="name" class="w-full" />
        </UFormField>
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" placeholder="you@store.com" autocomplete="email" class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password" help="At least 6 characters">
          <UInput v-model="state.password" type="password" placeholder="••••••••" autocomplete="new-password" class="w-full" />
        </UFormField>
        <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />
        <UAlert v-if="notice" color="info" variant="soft" :title="notice" icon="i-lucide-mail" />
        <UButton type="submit" block size="lg" :loading="loading" label="Create account" />
      </UForm>

      <template #footer>
        <p class="text-sm text-muted text-center">
          Already have an account?
          <ULink to="/login" class="text-primary font-medium">Sign in</ULink>
        </p>
      </template>
    </UCard>
  </div>
</template>
