<script setup lang="ts">
import type { ProductDraft } from '~~/shared/types/product'

// Self-contained product editor. Rendered on the standalone editor page and inline
// (per row) in the wizard's products review. Non-blocking fetch + graceful
// not-found so it can mount lazily anywhere; navigation is left to the parent via
// the `deleted` event (it never calls navigateTo itself).
//
// `currency` is an optional live override for the price label: the store currency
// can change while this editor is open (relabelling every product server-side), and
// our own fetched product would otherwise show a stale code until refetched. The
// parent passes the current store currency so the label stays in sync immediately.
// `embedded` is set when this editor is rendered inline in the onboarding wizard:
// it drops the editor's own Save button (the wizard's Next button drives the save
// via the exposed save() below) and stays quiet on success (no toast — advancing
// is the feedback).
const props = defineProps<{
  storeId: string
  productId: string
  currency?: string | null
  embedded?: boolean
  // The parent's current unsaved draft for this product (wizard). When present the
  // editor seeds from it so re-opening a row restores in-progress edits.
  draft?: ProductDraft | null
}>()
// `edit` carries the live draft up to the parent (the wizard list reflects it and
// holds it until Next saves); null when the form matches the saved product.
const emit = defineEmits<{ deleted: []; changed: []; edit: [ProductDraft | null] }>()
const toast = useToast()

const { data, refresh, pending } = useFetch(
  () => `/api/admin/stores/${props.storeId}/products/${props.productId}`,
  { lazy: true, getCachedData: () => undefined },
)
const product = computed(() => data.value?.product ?? null)
const displayCurrency = computed(() => props.currency ?? product.value?.currency ?? null)

// Shared list so categories created in the wizard's manager panel appear here live.
const { data: catData } = useStoreCategories(() => props.storeId)
const categoryOptions = computed(() => (catData.value?.categories ?? []).map((c) => ({ label: c.name, value: c.id })))

const title = ref('')
const price = ref('')
const description = ref('')
const published = ref(false)
const stock = ref('')
const categoryIds = ref<string[]>([])

// Seed the form once the product loads — preferring an in-progress draft passed down
// by the parent (wizard), so re-opening a row restores unsaved edits. Seed only once
// per mount so our own later edits (or a background image refetch) never clobber what
// the seller is typing.
let seeded = false
watchEffect(() => {
  const p = product.value
  if (!p || seeded) return
  seeded = true
  const d = props.draft
  title.value = d?.title ?? p.title
  price.value = ((d?.price_minor ?? p.price_minor) / 100).toString()
  description.value = (d ? d.description : p.description) ?? ''
  published.value = d?.published ?? p.published
  const stockSrc = d ? d.stock : p.stock
  stock.value = stockSrc == null ? '' : String(stockSrc)
  categoryIds.value = [...(d?.category_ids ?? p.category_ids ?? [])]
})

// Mirror the form up to the parent so the list reflects edits live and keeps them in
// state until the wizard saves; a form back in sync with the saved product clears it.
function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((x) => set.has(x))
}
const draftValue = computed<ProductDraft>(() => ({
  title: title.value,
  description: description.value || null,
  price_minor: Math.round(Number.parseFloat(price.value || '0') * 100),
  published: published.value,
  stock: stock.value === '' ? null : Number.parseInt(stock.value, 10),
  category_ids: categoryIds.value,
}))
const dirty = computed(() => {
  const p = product.value
  if (!p) return false
  const d = draftValue.value
  return (
    d.title !== p.title ||
    d.price_minor !== p.price_minor ||
    d.description !== (p.description ?? null) ||
    d.published !== p.published ||
    d.stock !== (p.stock ?? null) ||
    !sameIds(d.category_ids, p.category_ids ?? [])
  )
})
watch([dirty, draftValue], ([isDirty, d]) => emit('edit', isDirty ? d : null), { deep: true })

const saving = ref(false)
const uploading = ref(false)
const error = ref<string | null>(null)

// Returns whether the save succeeded so a parent (the wizard) can hold off
// advancing when it fails — the error is already surfaced inline either way.
async function save(): Promise<boolean> {
  saving.value = true
  error.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/products/${props.productId}`, {
      method: 'PATCH',
      body: {
        title: title.value,
        description: description.value || null,
        price_minor: Math.round(Number.parseFloat(price.value || '0') * 100),
        published: published.value,
        stock: stock.value === '' ? null : Number.parseInt(stock.value, 10),
        category_ids: categoryIds.value,
      },
    })
    await refresh()
    emit('changed')
    if (!props.embedded) toast.add({ title: 'Product saved', icon: 'i-lucide-check', color: 'success' })
    return true
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Save failed'
    return false
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
      await $fetch(`/api/admin/stores/${props.storeId}/products/${props.productId}/image`, { method: 'POST', body: fd })
    }
    await refresh()
    emit('changed')
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
    await $fetch(`/api/admin/stores/${props.storeId}/products/${props.productId}/images/${id}`, { method: 'DELETE' })
    await refresh()
    emit('changed')
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
// pending form error behind the overlay.
const pickerError = ref<string | null>(null)

async function openPicker() {
  pickerOpen.value = true
  selectedSourceIds.value = []
  pickerError.value = null
  libraryLoading.value = true
  try {
    const res = await $fetch<{ products: LibProduct[] }>(
      `/api/admin/stores/${props.storeId}/products/${props.productId}/images/library`,
    )
    library.value = res.products
  } catch (e) {
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
    await $fetch(`/api/admin/stores/${props.storeId}/products/${props.productId}/images/copy`, {
      method: 'POST',
      body: { sourceImageIds: selectedSourceIds.value },
    })
    pickerOpen.value = false
    await refresh()
    emit('changed')
  } catch (e) {
    pickerError.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not add images'
  } finally {
    copying.value = false
  }
}

async function makePrimary(id: string) {
  const ids = (product.value?.images ?? []).map((i) => i.id)
  const reordered = [id, ...ids.filter((x) => x !== id)]
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/products/${props.productId}/images/reorder`, {
      method: 'POST',
      body: { ids: reordered },
    })
    await refresh()
    emit('changed')
  } catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Reorder failed'
  }
}

async function remove() {
  if (!confirm('Delete this product?')) return
  await $fetch(`/api/admin/stores/${props.storeId}/products/${props.productId}`, { method: 'DELETE' })
  emit('deleted')
}
</script>

<template>
  <div v-if="!product && pending" class="py-10 grid place-items-center text-ink-subtle">
    <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
  </div>
  <div v-else-if="!product" class="py-8 text-center text-ink-muted">
    <UIcon name="i-lucide-package-x" class="size-8 text-ink-subtle mx-auto" />
    <p class="mt-2 text-sm">Product not found.</p>
  </div>

  <div v-else class="grid gap-8 md:grid-cols-[260px_1fr]">
    <!-- images -->
    <div>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="(img, i) in product.images ?? []"
          :key="img.id"
          class="group relative aspect-square rounded-lg overflow-hidden bg-black/5 border"
          :class="i === 0 ? 'border-primary' : 'border-default'"
        >
          <img v-if="img.public_url" :src="img.public_url" :alt="img.alt ?? product.title" class="w-full h-full object-cover">
          <div v-else class="w-full h-full grid place-items-center text-ink-subtle">
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
          class="aspect-square rounded-lg bg-black/5 border border-default grid place-items-center text-ink-subtle"
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
    <div class="rounded-xl border border-default bg-white p-5 sm:p-6">
      <form class="space-y-5" @submit.prevent="save">
        <UFormField label="Title" name="title">
          <UInput v-model="title" type="text" required class="w-full" />
        </UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Price" name="price">
            <UInput v-model="price" type="number" min="0" step="0.01" required class="w-full">
              <template v-if="displayCurrency" #trailing>
                <span class="text-xs text-ink-muted">{{ displayCurrency }}</span>
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Stock" name="stock" help="Blank = untracked">
            <UInput v-model="stock" type="number" min="0" step="1" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Description" name="description">
          <UTextarea v-model="description" :rows="4" class="w-full" />
        </UFormField>
        <UFormField label="Visibility" name="published">
          <USwitch
            v-model="published"
            :label="published ? 'Visible — shown on your storefront' : 'Hidden — not shown to shoppers'"
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
        </UFormField>

        <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" />

        <div class="flex items-center justify-end *:gap-3">
          <UButton v-if="!embedded" type="submit" :loading="saving" :disabled="saving" icon="i-lucide-check" :label="saving ? 'Saving…' : 'Save'" />
          <UButton type="button" color="error" variant="soft" icon="i-lucide-trash-2" label="Delete" @click="remove" />
        </div>
      </form>
    </div>
  </div>

  <UModal v-model:open="pickerOpen" title="Add from another product" :dismissible="!copying">
    <template #body>
      <UAlert v-if="pickerError" color="error" variant="soft" :title="pickerError" icon="i-lucide-circle-alert" class="mb-4" />
      <div v-if="libraryLoading" class="py-10 grid place-items-center text-ink-subtle">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      </div>
      <div v-else-if="!library.length" class="py-10 text-center text-ink-muted">
        <UIcon name="i-lucide-image-off" class="size-8 text-ink-subtle mx-auto" />
        <p class="mt-3 text-sm">No images on your other products yet.</p>
      </div>
      <div v-else class="space-y-6 max-h-[60vh] overflow-y-auto">
        <div v-for="lp in library" :key="lp.id">
          <p class="text-sm font-medium text-ink mb-2">{{ lp.title }}</p>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <button
              v-for="img in lp.images"
              :key="img.id"
              type="button"
              class="group relative aspect-square rounded-lg overflow-hidden bg-black/5 border transition"
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
</template>
