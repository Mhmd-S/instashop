<script setup lang="ts">
import type { AdminProduct } from '~~/shared/types/product'
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

// The wizard's Next button has no per-product Save button to lean on, so it asks
// us to persist whatever editor is open before advancing. We hold a ref to the
// single mounted editor (keyed by id so the unmount of a stale one never clobbers
// a freshly-mounted one) and expose save() up to the onboarding page.
const openEditor = shallowRef<{ id: string; el: { save: () => Promise<boolean> } } | null>(null)
function bindEditor(id: string, el: unknown) {
  if (el) openEditor.value = { id, el: el as { save: () => Promise<boolean> } }
  else if (openEditor.value?.id === id) openEditor.value = null
}
async function save(): Promise<boolean> {
  return openEditor.value ? await openEditor.value.el.save() : true
}
defineExpose({ save })

const busyId = ref<string | null>(null)
const creating = ref(false)
const err = ref<string | null>(null)

async function quickPublish(p: AdminProduct) {
  busyId.value = p.id
  err.value = null
  try {
    const status = p.status === 'published' ? 'draft' : 'published'
    await $fetch(`/api/admin/stores/${props.storeId}/products/${p.id}`, { method: 'PATCH', body: { status } })
    await refresh()
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not update product'
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
      body: { title: 'New product', description: null, price_minor: 0, status: 'draft' },
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
  expanded.value = null
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
        <li v-for="p in products" :key="p.id" class="rounded-lg border border-default overflow-hidden">
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
            <UBadge :color="p.status === 'published' ? 'success' : 'neutral'" variant="subtle" size="xs" class="capitalize" :label="p.status" />
            <UButton
              v-if="expanded !== p.id"
              size="xs" color="neutral" variant="ghost"
              :icon="p.status === 'published' ? 'i-lucide-eye-off' : 'i-lucide-check'"
              :label="p.status === 'published' ? 'Unpublish' : 'Publish'"
              :loading="busyId === p.id" :disabled="busyId === p.id"
              @click="quickPublish(p)"
            />
          </div>
          <div v-if="expanded === p.id" class="border-t border-default p-4 bg-elevated/30">
            <ProductEditor
              :ref="(el) => bindEditor(p.id, el)"
              :store-id="storeId"
              :product-id="p.id"
              :currency="currency"
              embedded
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
