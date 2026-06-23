<script setup lang="ts">
definePageMeta({ surface: 'admin', layout: false })

const supabase = useSupabaseClient()
const fullName = ref('')
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  loading.value = true
  error.value = null
  notice.value = null
  const { data, error: e } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: { data: { full_name: fullName.value } },
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
        <h1 class="text-xl font-semibold text-highlighted">Create your account</h1>
        <p class="text-sm text-muted mt-1">Start your Insteshop store</p>
      </template>

      <form class="space-y-4" @submit.prevent="submit">
        <UFormField label="Name" name="name">
          <UInput v-model="fullName" placeholder="Your name" autocomplete="name" class="w-full" />
        </UFormField>
        <UFormField label="Email" name="email">
          <UInput v-model="email" type="email" placeholder="you@store.com" autocomplete="email" required class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password" help="At least 6 characters">
          <UInput v-model="password" type="password" placeholder="••••••••" autocomplete="new-password" required class="w-full" />
        </UFormField>
        <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />
        <UAlert v-if="notice" color="info" variant="soft" :title="notice" icon="i-lucide-mail" />
        <UButton type="submit" block size="lg" :loading="loading" label="Create account" />
      </form>

      <template #footer>
        <p class="text-sm text-muted text-center">
          Already have an account?
          <ULink to="/login" class="text-primary font-medium">Sign in</ULink>
        </p>
      </template>
    </UCard>
  </div>
</template>
