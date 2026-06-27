<script setup lang="ts">
import type { AdminProduct, ProductDraft } from '~~/shared/types/product'
import { formatPrice } from '~~/shared/types/product'

// Inline products review for the wizard: a compact list of imported products, each
// expandable to the full ProductEditor — so reviewing/finalising products never
// leaves the onboarding layout. Non-blocking, always-fresh fetch.
const props = defineProps<{ storeId: string }>()

const { data, refresh, pending } = useFetch(`/api/admin/stores/${props.storeId}/products`, {
  lazy: true,
  getCachedData: () => undefined,
})
const products = computed(() => data.value?.products ?? [])
// The store has a single currency, mirrored onto every product. Surface it from the
// (refreshed-on-change) list so an open editor's price label tracks currency changes
// without having to refetch the product itself.
const currency = computed(() => products.value[0]?.currency ?? null)

// One open editor at a time keeps the list scannable and avoids mounting N editors.
const expanded = ref<string | null>(null)
function toggle(id: string) {
  expanded.value = expanded.value === id ? null : id
}

// Unsaved edits per product, lifted out of the inline editors. The list rows render
// these over the fetched product so edits show immediately, and they survive
// collapsing/switching rows — the wizard's Next button persists them all at once.
const drafts = ref<Record<string, ProductDraft>>({})
function onEdit(id: string, draft: ProductDraft | null) {
  if (!draft && !(id in drafts.value)) return // clean editor with nothing to clear
  const next = { ...drafts.value }
  if (draft) next[id] = draft
  else delete next[id]
  drafts.value = next
}
// Products with their pending edits applied, for display.
const rows = computed(() =>
  products.value.map((p) => {
    const d = drafts.value[p.id]
    return d ? { ...p, title: d.title, price_minor: d.price_minor, published: d.published } : p
  }),
)

// Take every priced unpublished product live in one request. Unpriced ones stay
// hidden so we never publish a $0 listing; the seller prices them later.
async function publishDrafts(): Promise<boolean> {
  err.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/products/publish-drafts`, { method: 'POST' })
    await refresh()
    return true
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not publish products'
    return false
  }
}

// The wizard's Next button calls this to finish the products step: persist every
// pending edit, then publish the priced drafts. A failure stops the wizard from
// advancing (the error shows inline above).
async function save(): Promise<boolean> {
  err.value = null
  const pending = Object.entries(drafts.value)
  try {
    for (const [id, body] of pending) {
      await $fetch(`/api/admin/stores/${props.storeId}/products/${id}`, { method: 'PATCH', body })
    }
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not save changes'
    return false
  }
  drafts.value = {}
  if (pending.length) await refresh()
  return await publishDrafts()
}
defineExpose({ save })

const busyId = ref<string | null>(null)
const creating = ref(false)
const err = ref<string | null>(null)

async function quickPublish(p: AdminProduct) {
  busyId.value = p.id
  err.value = null
  const published = !p.published
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/products/${p.id}`, { method: 'PATCH', body: { published } })
    // Keep an in-progress draft for this row in sync so the Next save won't revert it.
    const d = drafts.value[p.id]
    if (d) onEdit(p.id, { ...d, published })
    await refresh()
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not update product'
  } finally {
    busyId.value = null
  }
}

// Delete straight from the row — no need to expand the product first.
async function quickDelete(p: AdminProduct) {
  if (!confirm(`Delete "${p.title}"?`)) return
  busyId.value = p.id
  err.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/products/${p.id}`, { method: 'DELETE' })
    if (expanded.value === p.id) expanded.value = null
    onEdit(p.id, null) // drop any pending draft for the gone product
    await refresh()
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not delete product'
  } finally {
    busyId.value = null
  }
}

async function addProduct() {
  creating.value = true
  err.value = null
  try {
    const { product } = await $fetch(`/api/admin/stores/${props.storeId}/products`, {
      method: 'POST',
      body: { title: 'New product', description: null, price_minor: 0, published: false },
    })
    await refresh()
    expanded.value = product.id
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not add product'
  } finally {
    creating.value = false
  }
}

function onDeleted() {
  const id = expanded.value
  expanded.value = null
  if (id) onEdit(id, null) // drop any pending draft for the gone product
  refresh()
}
</script>

<template>
  <div>
    <div class="mb-5 rounded-xl border border-default divide-y divide-default">
      <div class="p-4">
        <StoreCurrencySelect :store-id="storeId" @changed="() => refresh()" />
      </div>
      <div class="p-4">
        <CategoryManager :store-id="storeId" />
      </div>
    </div>

    <UAlert v-if="err" color="error" variant="soft" :title="err" icon="i-lucide-circle-alert" class="mb-4" />

    <div v-if="pending && !products.length" class="py-10 grid place-items-center text-dimmed">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
    </div>

    <div v-else-if="!products.length" class="rounded-lg border border-default text-center py-10">
      <UIcon name="i-lucide-package" class="size-10 text-dimmed mx-auto" />
      <p class="mt-3 text-muted">No products yet. Import from Instagram, or add one by hand.</p>
      <UButton class="mt-4" icon="i-lucide-plus" :loading="creating" label="Add a product" @click="addProduct" />
    </div>

    <template v-else>
      <ul class="space-y-2">
        <li v-for="p in rows" :key="p.id" class="rounded-lg border border-default overflow-hidden">
          <div class="flex items-center gap-3 p-3">
            <button type="button" class="flex items-center gap-3 min-w-0 flex-1 text-left" @click="toggle(p.id)">
              <UIcon :name="expanded === p.id ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4 shrink-0 text-dimmed" />
              <img v-if="p.image_url" :src="p.image_url" :alt="p.title" class="size-10 rounded object-cover border border-default shrink-0">
              <div v-else class="size-10 rounded bg-muted border border-default grid place-items-center shrink-0">
                <UIcon name="i-lucide-image" class="size-4 text-dimmed" />
              </div>
              <div class="min-w-0">
                <p class="font-medium text-highlighted truncate">{{ p.title }}</p>
                <p class="text-xs text-muted">{{ formatPrice(p.price_minor, p.currency) }}</p>
              </div>
            </button>
            <UBadge v-if="p.needs_review" color="warning" variant="subtle" size="xs" label="Review" />
            <UBadge :color="p.published ? 'success' : 'neutral'" variant="subtle" size="xs" :label="p.published ? 'Published' : 'Hidden'" />
            <UButton
              v-if="expanded !== p.id"
              size="xs" color="neutral" variant="ghost"
              :icon="p.published ? 'i-lucide-eye-off' : 'i-lucide-check'"
              :label="p.published ? 'Unpublish' : 'Publish'"
              :loading="busyId === p.id" :disabled="busyId === p.id"
              @click="quickPublish(p)"
            />
            <UButton
              v-if="expanded !== p.id"
              size="xs" color="error" variant="ghost" icon="i-lucide-trash-2"
              title="Delete" :disabled="busyId === p.id"
              @click="quickDelete(p)"
            />
          </div>
          <div v-if="expanded === p.id" class="border-t border-default p-4 bg-elevated/30">
            <ProductEditor
              :store-id="storeId"
              :product-id="p.id"
              :currency="currency"
              :draft="drafts[p.id] ?? null"
              embedded
              @edit="(d) => onEdit(p.id, d)"
              @changed="refresh"
              @deleted="onDeleted"
            />
          </div>
        </li>
      </ul>
      <UButton class="mt-3" variant="soft" color="neutral" icon="i-lucide-plus" :loading="creating" label="Add a product" @click="addProduct" />
    </template>
  </div>
</template>
