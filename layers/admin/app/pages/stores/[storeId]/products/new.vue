<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
// Preserve onboarding-wizard context when drilled in from the products step.
const ret = computed(() => safeReturnPath(route.query.return))
const retQs = computed(() => (ret.value ? `?return=${encodeURIComponent(ret.value)}` : ''))
const title = ref('')
const price = ref('')
const description = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  loading.value = true
  error.value = null
  try {
    const priceMinor = Math.round(Number.parseFloat(price.value || '0') * 100)
    const { product } = await $fetch(`/api/admin/stores/${storeId}/products`, {
      method: 'POST',
      body: { title: title.value, description: description.value || null, price_minor: priceMinor, published: false },
    })
    await navigateTo(`/stores/${storeId}/products/${product.id}${retQs.value}`)
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    error.value = err.data?.statusMessage || err.statusMessage || 'Could not create product'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-lg">
    <UButton :to="`/stores/${storeId}/products${retQs}`" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" label="Products" class="px-0" />
    <h1 class="text-2xl font-bold text-highlighted mt-1 mb-6">New product</h1>

    <UCard>
      <form class="space-y-5" @submit.prevent="submit">
        <UFormField label="Title" name="title">
          <UInput v-model="title" type="text" required placeholder="Hand-thrown mug" class="w-full" />
        </UFormField>
        <UFormField label="Price" name="price">
          <UInput v-model="price" type="number" min="0" step="0.01" required placeholder="24.00" class="w-full" />
        </UFormField>
        <UFormField label="Description" name="description">
          <UTextarea v-model="description" :rows="4" placeholder="A cozy ceramic mug…" class="w-full" />
        </UFormField>

        <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />

        <UButton
          type="submit"
          :loading="loading"
          :disabled="loading || !title || !price"
          icon="i-lucide-plus"
          :label="loading ? 'Creating…' : 'Create product'"
        />
        <p class="text-xs text-muted">You'll add a photo on the next screen. New products start hidden — publish when ready.</p>
      </form>
    </UCard>
  </div>
</template>
