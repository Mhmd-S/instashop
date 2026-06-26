<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
// Preserve onboarding-wizard context when drilled in from the products step.
const ret = computed(() => safeReturnPath(route.query.return))
const retQs = computed(() => (ret.value ? `?return=${encodeURIComponent(ret.value)}` : ''))

const url = ref('')
const caption = ref('')
const title = ref('')
const price = ref('')
const files = ref<File[]>([])
const error = ref<string | null>(null)
const loading = ref(false)

function onFiles(e: Event) {
  const list = (e.target as HTMLInputElement).files
  files.value = list ? Array.from(list) : []
}

// A caption or a title is enough — the link and photo are optional but encouraged.
const canSubmit = computed(() => !!(caption.value.trim() || title.value.trim()))

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = null
  try {
    const priceMajor = price.value.trim() ? Number.parseFloat(price.value) : undefined
    const { product } = await $fetch(`/api/admin/stores/${storeId}/ig/manual`, {
      method: 'POST',
      body: {
        url: url.value.trim() || undefined,
        caption: caption.value.trim() || undefined,
        title: title.value.trim() || undefined,
        price: priceMajor != null && Number.isFinite(priceMajor) ? priceMajor : undefined,
      },
    })

    // Reuse the standard product-image endpoint for any photos the seller dropped in.
    for (const file of files.value) {
      const fd = new FormData()
      fd.append('file', file)
      await $fetch(`/api/admin/stores/${storeId}/products/${product.id}/image`, { method: 'POST', body: fd })
    }

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
    <h1 class="text-2xl font-bold text-highlighted mt-1">Add from an Instagram post</h1>
    <p class="text-sm text-muted mt-1 mb-6">
      No account connection needed. Paste a post's caption and we'll draft the product for you — add the photo below or on the next screen.
    </p>

    <UCard>
      <form class="space-y-5" @submit.prevent="submit">
        <UFormField label="Instagram post link" name="url" hint="Optional">
          <UInput v-model="url" type="url" placeholder="https://www.instagram.com/p/…" class="w-full" />
          <template #help>Saved with the product for your reference. We never post or pull anything from your account.</template>
        </UFormField>

        <UFormField label="Caption" name="caption">
          <UTextarea v-model="caption" :rows="5" placeholder="Paste the post's caption here…" class="w-full" />
          <template #help>We'll turn this into a title, description, price, and categories. You can edit everything after.</template>
        </UFormField>

        <UFormField label="Photo" name="photo" hint="Optional">
          <input type="file" accept="image/*" multiple class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-default hover:file:bg-accented" @change="onFiles">
          <template #help>The image is yours to upload — you can also add it on the next screen.</template>
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Title override" name="title" hint="Optional">
            <UInput v-model="title" type="text" placeholder="Auto from caption" class="w-full" />
          </UFormField>
          <UFormField label="Price override" name="price" hint="Optional">
            <UInput v-model="price" type="number" min="0" step="0.01" placeholder="Auto from caption" class="w-full" />
          </UFormField>
        </div>

        <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />

        <UButton
          type="submit"
          :loading="loading"
          :disabled="loading || !canSubmit"
          icon="i-lucide-plus"
          :label="loading ? 'Creating…' : 'Create draft product'"
        />
        <p class="text-xs text-muted">New products start as drafts — review and publish when you're ready.</p>
      </form>
    </UCard>
  </div>
</template>
