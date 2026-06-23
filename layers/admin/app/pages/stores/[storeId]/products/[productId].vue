<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'
import type { ProductStatus } from '~~/shared/types/product'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
const productId = route.params.productId as string
// Preserve onboarding-wizard context when drilled in from the products step.
const ret = computed(() => safeReturnPath(route.query.return))
const retQs = computed(() => (ret.value ? `?return=${encodeURIComponent(ret.value)}` : ''))

const { data, refresh } = await useFetch(`/api/admin/stores/${storeId}/products/${productId}`)
if (!data.value?.product) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })
}
const product = computed(() => data.value!.product)

const { data: catData } = await useFetch(`/api/admin/stores/${storeId}/categories`)
const categoryOptions = computed(() => (catData.value?.categories ?? []).map((c) => ({ label: c.name, value: c.id })))

const title = ref('')
const price = ref('')
const description = ref('')
const status = ref<ProductStatus>('draft')
const stock = ref('')
const categoryIds = ref<string[]>([])

watchEffect(() => {
  const p = product.value
  if (!p) return
  title.value = p.title
  price.value = (p.price_minor / 100).toString()
  description.value = p.description ?? ''
  status.value = p.status
  stock.value = p.stock == null ? '' : String(p.stock)
  categoryIds.value = [...(p.category_ids ?? [])]
})

const saving = ref(false)
const uploading = ref(false)
const error = ref<string | null>(null)

async function save() {
  saving.value = true
  error.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}/products/${productId}`, {
      method: 'PATCH',
      body: {
        title: title.value,
        description: description.value || null,
        price_minor: Math.round(Number.parseFloat(price.value || '0') * 100),
        status: status.value,
        stock: stock.value === '' ? null : Number.parseInt(stock.value, 10),
        category_ids: categoryIds.value,
      },
    })
    await refresh()
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Save failed'
  } finally {
    saving.value = false
  }
}

async function onFile(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files || !files.length) return
  uploading.value = true
  error.value = null
  try {
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      await $fetch(`/api/admin/stores/${storeId}/products/${productId}/image`, { method: 'POST', body: fd })
    }
    await refresh()
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Upload failed'
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function deleteImage(id: string) {
  if (!confirm('Remove this image?')) return
  error.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}/products/${productId}/images/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Delete failed'
  }
}

// --- Reuse images from another product ---
interface LibImage { id: string; public_url: string; alt: string | null; is_video: boolean }
interface LibProduct { id: string; title: string; images: LibImage[] }

const pickerOpen = ref(false)
const library = ref<LibProduct[]>([])
const libraryLoading = ref(false)
const selectedSourceIds = ref<string[]>([])
const copying = ref(false)
// Scoped to the modal so opening the picker / a copy failure never clobbers a
// pending form error (e.g. an unsaved "Save failed") behind the overlay.
const pickerError = ref<string | null>(null)

async function openPicker() {
  pickerOpen.value = true
  selectedSourceIds.value = []
  pickerError.value = null
  libraryLoading.value = true
  try {
    const res = await $fetch<{ products: LibProduct[] }>(
      `/api/admin/stores/${storeId}/products/${productId}/images/library`,
    )
    library.value = res.products
  } catch (e) {
    // Load failed -> close the modal and surface on the page (modal is gone).
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Failed to load images'
    pickerOpen.value = false
  } finally {
    libraryLoading.value = false
  }
}

function toggleSource(id: string) {
  const i = selectedSourceIds.value.indexOf(id)
  if (i === -1) selectedSourceIds.value.push(id)
  else selectedSourceIds.value.splice(i, 1)
}

async function addSelected() {
  if (!selectedSourceIds.value.length) return
  copying.value = true
  pickerError.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}/products/${productId}/images/copy`, {
      method: 'POST',
      body: { sourceImageIds: selectedSourceIds.value },
    })
    pickerOpen.value = false
    await refresh()
  } catch (e) {
    // Modal stays open for retry -> show the error inside the modal.
    pickerError.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not add images'
  } finally {
    copying.value = false
  }
}

async function makePrimary(id: string) {
  const ids = (product.value.images ?? []).map((i) => i.id)
  const reordered = [id, ...ids.filter((x) => x !== id)]
  try {
    await $fetch(`/api/admin/stores/${storeId}/products/${productId}/images/reorder`, {
      method: 'POST',
      body: { ids: reordered },
    })
    await refresh()
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Reorder failed'
  }
}

async function remove() {
  if (!confirm('Delete this product?')) return
  await $fetch(`/api/admin/stores/${storeId}/products/${productId}`, { method: 'DELETE' })
  await navigateTo(`/stores/${storeId}/products${retQs.value}`)
}
</script>

<template>
  <div class="max-w-2xl">
    <SetupFlowBar current="products" />
    <UButton :to="`/stores/${storeId}/products${retQs}`" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" label="Products" class="px-0" />
    <h1 class="text-2xl font-bold text-highlighted mt-1 mb-6">Edit product</h1>

    <div class="grid gap-8 md:grid-cols-[260px_1fr]">
      <!-- images -->
      <div>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="(img, i) in product.images ?? []"
            :key="img.id"
            class="group relative aspect-square rounded-lg overflow-hidden bg-muted border"
            :class="i === 0 ? 'border-primary' : 'border-default'"
          >
            <img v-if="img.public_url" :src="img.public_url" :alt="img.alt ?? product.title" class="w-full h-full object-cover">
            <div v-else class="w-full h-full grid place-items-center text-dimmed">
              <UIcon name="i-lucide-image" class="size-6" />
            </div>
            <span v-if="i === 0" class="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">
              Primary
            </span>
            <div class="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-black/40 p-1 opacity-0 transition group-hover:opacity-100">
              <UButton
                v-if="i !== 0"
                size="xs"
                color="neutral"
                variant="solid"
                icon="i-lucide-star"
                title="Make primary"
                @click="makePrimary(img.id)"
              />
              <UButton size="xs" color="error" variant="solid" icon="i-lucide-trash-2" title="Remove" @click="deleteImage(img.id)" />
            </div>
          </div>
          <div
            v-if="!(product.images ?? []).length"
            class="aspect-square rounded-lg bg-muted border border-default grid place-items-center text-dimmed"
          >
            <UIcon name="i-lucide-image" class="size-8" />
          </div>
        </div>
        <UButton
          as="label"
          variant="soft"
          color="neutral"
          size="sm"
          block
          icon="i-lucide-upload"
          :loading="uploading"
          :label="uploading ? 'Uploading…' : 'Upload photos'"
          class="mt-3 cursor-pointer"
        >
          <input type="file" accept="image/*" multiple class="hidden" :disabled="uploading" @change="onFile">
        </UButton>
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          block
          icon="i-lucide-images"
          label="Add from another product"
          class="mt-2"
          @click="openPicker"
        />
      </div>

      <!-- fields -->
      <UCard>
        <form class="space-y-5" @submit.prevent="save">
          <UFormField label="Title" name="title">
            <UInput v-model="title" type="text" required class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Price" name="price">
              <UInput v-model="price" type="number" min="0" step="0.01" required class="w-full" />
            </UFormField>
            <UFormField label="Stock" name="stock" help="Blank = untracked">
              <UInput v-model="stock" type="number" min="0" step="1" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Description" name="description">
            <UTextarea v-model="description" :rows="4" class="w-full" />
          </UFormField>
          <UFormField label="Status" name="status">
            <USelect
              v-model="status"
              :items="[
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' },
                { label: 'Archived', value: 'archived' },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Categories" name="categories">
            <USelectMenu
              v-model="categoryIds"
              :items="categoryOptions"
              multiple
              value-key="value"
              placeholder="Assign categories…"
              class="w-full"
            />
            <template #help>
              <ULink :to="`/stores/${storeId}/categories`" class="text-primary">Manage categories</ULink>
            </template>
          </UFormField>

          <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />

          <div class="flex items-center gap-3">
            <UButton type="submit" :loading="saving" :disabled="saving" icon="i-lucide-check" :label="saving ? 'Saving…' : 'Save'" />
            <UButton type="button" color="error" variant="ghost" icon="i-lucide-trash-2" label="Delete" @click="remove" />
          </div>
        </form>
      </UCard>
    </div>

    <UModal v-model:open="pickerOpen" title="Add from another product" :dismissible="!copying">
      <template #body>
        <UAlert v-if="pickerError" color="error" variant="soft" :title="pickerError" icon="i-lucide-circle-alert" class="mb-4" />
        <div v-if="libraryLoading" class="py-10 grid place-items-center text-dimmed">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
        </div>
        <div v-else-if="!library.length" class="py-10 text-center text-muted">
          <UIcon name="i-lucide-image-off" class="size-8 text-dimmed mx-auto" />
          <p class="mt-3 text-sm">No images on your other products yet.</p>
        </div>
        <div v-else class="space-y-6 max-h-[60vh] overflow-y-auto">
          <div v-for="lp in library" :key="lp.id">
            <p class="text-sm font-medium text-highlighted mb-2">{{ lp.title }}</p>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <button
                v-for="img in lp.images"
                :key="img.id"
                type="button"
                class="group relative aspect-square rounded-lg overflow-hidden bg-muted border transition"
                :class="selectedSourceIds.includes(img.id) ? 'border-primary ring-2 ring-primary' : 'border-default hover:border-primary'"
                @click="toggleSource(img.id)"
              >
                <img :src="img.public_url" :alt="img.alt ?? lp.title" class="w-full h-full object-cover">
                <span
                  v-if="selectedSourceIds.includes(img.id)"
                  class="absolute right-1 top-1 grid place-items-center size-5 rounded-full bg-primary text-white"
                >
                  <UIcon name="i-lucide-check" class="size-3.5" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" label="Cancel" :disabled="copying" @click="pickerOpen = false" />
          <UButton
            icon="i-lucide-plus"
            :label="copying ? 'Adding…' : selectedSourceIds.length ? `Add ${selectedSourceIds.length} image${selectedSourceIds.length > 1 ? 's' : ''}` : 'Add images'"
            :loading="copying"
            :disabled="!selectedSourceIds.length || copying"
            @click="addSelected"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
