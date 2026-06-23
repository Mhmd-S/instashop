<script setup lang="ts">
definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const { data, refresh } = await useFetch('/api/admin/stores')
const { storeUrl } = useSurfaceUrls()
const stores = computed(() => data.value?.stores ?? [])

// Delete flow — type-to-confirm so an owner can't nuke a store by misclick.
const toDelete = ref<{ id: string; name: string; subdomain: string } | null>(null)
const confirmText = ref('')
const deleting = ref(false)
const delError = ref<string | null>(null)

const deleteOpen = computed({
  get: () => !!toDelete.value,
  set: (v: boolean) => {
    if (!v) toDelete.value = null
  },
})
watch(toDelete, () => {
  confirmText.value = ''
  delError.value = null
})
const canDelete = computed(
  () => !!toDelete.value && confirmText.value.trim().toLowerCase() === toDelete.value.subdomain.toLowerCase(),
)

async function confirmDelete() {
  if (!toDelete.value || !canDelete.value) return
  deleting.value = true
  delError.value = null
  try {
    await $fetch(`/api/admin/stores/${toDelete.value.id}`, {
      method: 'DELETE',
      body: { confirm: confirmText.value.trim() },
    })
    toDelete.value = null
    await refresh()
  } catch (e) {
    delError.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Failed to delete store'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <!-- Empty state: a guided welcome that launches the setup wizard. -->
    <div v-if="!stores.length" class="mx-auto max-w-2xl text-center py-8">
      <div class="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <UIcon name="i-lucide-sparkles" class="size-7" />
      </div>
      <h1 class="text-3xl font-bold text-highlighted">Turn your Instagram into a store</h1>
      <p class="text-muted mt-2">
        Connect your account, customize the look, and launch a shoppable storefront in minutes.
      </p>
      <UButton to="/onboarding" size="lg" class="mt-6" icon="i-lucide-plus" label="Get started" />

      <div class="mt-10 grid gap-4 sm:grid-cols-3 text-left">
        <div class="rounded-xl border border-default p-4">
          <UIcon name="i-lucide-instagram" class="size-5 text-primary" />
          <p class="font-medium text-highlighted mt-2">Import posts</p>
          <p class="text-sm text-muted mt-0.5">AI turns your Instagram posts into draft products.</p>
        </div>
        <div class="rounded-xl border border-default p-4">
          <UIcon name="i-lucide-palette" class="size-5 text-primary" />
          <p class="font-medium text-highlighted mt-2">Customize</p>
          <p class="text-sm text-muted mt-0.5">A theme, palette and hero derived from your brand.</p>
        </div>
        <div class="rounded-xl border border-default p-4">
          <UIcon name="i-lucide-rocket" class="size-5 text-primary" />
          <p class="font-medium text-highlighted mt-2">Launch</p>
          <p class="text-sm text-muted mt-0.5">Preview, then share your live storefront link.</p>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-highlighted">Your stores</h1>
          <p class="text-muted mt-1">Manage your Instagram-powered storefronts.</p>
        </div>
        <UButton to="/onboarding" icon="i-lucide-plus" label="New store" />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
      <UCard v-for="s in stores" :key="s.id">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-semibold text-highlighted">{{ s.name }}</h2>
            <p class="text-sm text-muted">{{ s.subdomain }}</p>
          </div>
          <UBadge :color="s.status === 'active' ? 'success' : 'neutral'" variant="subtle" :label="s.status" />
        </div>

        <div class="flex flex-wrap gap-2 mt-4">
          <UButton :to="`/stores/${s.id}/products`" size="xs" color="neutral" variant="soft" icon="i-lucide-package" label="Products" />
          <UButton :to="`/stores/${s.id}/categories`" size="xs" color="neutral" variant="soft" icon="i-lucide-tags" label="Categories" />
          <UButton :to="`/stores/${s.id}/orders`" size="xs" color="neutral" variant="soft" icon="i-lucide-shopping-cart" label="Orders" />
          <UButton :to="`/stores/${s.id}/checkout`" size="xs" color="neutral" variant="soft" icon="i-lucide-clipboard-list" label="Checkout" />
          <UButton :to="`/stores/${s.id}/payments`" size="xs" color="neutral" variant="soft" icon="i-lucide-credit-card" label="Payments" />
          <UButton :to="`/stores/${s.id}/theme`" size="xs" color="neutral" variant="soft" icon="i-lucide-palette" label="Theme" />
          <UButton :to="`/stores/${s.id}/instagram`" size="xs" color="neutral" variant="soft" icon="i-lucide-instagram" label="Instagram" />
          <UButton :to="`/stores/${s.id}/branding`" size="xs" color="neutral" variant="soft" icon="i-lucide-images" label="Branding" />
        </div>

        <template #footer>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-3">
              <UButton
                :to="storeUrl(s.subdomain)" target="_blank" external
                size="xs" variant="link" color="neutral"
                trailing-icon="i-lucide-external-link" label="View storefront"
              />
              <UButton
                :to="`/onboarding?store=${s.id}`"
                size="xs" variant="link" color="primary"
                icon="i-lucide-wand-2" label="Setup guide"
              />
            </div>
            <UButton
              v-if="s.role === 'owner'"
              size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" label="Delete"
              @click="toDelete = { id: s.id, name: s.name, subdomain: s.subdomain }"
            />
          </div>
        </template>
      </UCard>
      </div>
    </template>

    <UModal v-model:open="deleteOpen" :title="`Delete ${toDelete?.name ?? 'store'}?`" :dismissible="!deleting">
      <template #body>
        <div class="space-y-4">
          <UAlert
            color="error" variant="subtle" icon="i-lucide-triangle-alert"
            title="This permanently deletes the store"
            description="Products, orders, categories, theme, branding, the Instagram connection, and every uploaded image are removed. This can't be undone."
          />
          <p class="text-sm text-muted">
            Type <strong class="text-highlighted">{{ toDelete?.subdomain }}</strong> to confirm.
          </p>
          <UInput
            v-model="confirmText" autofocus autocomplete="off" class="w-full"
            :placeholder="toDelete?.subdomain"
            @keydown.enter="confirmDelete"
          />
          <UAlert v-if="delError" color="error" variant="soft" :title="delError" icon="i-lucide-circle-alert" />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" label="Cancel" :disabled="deleting" @click="toDelete = null" />
          <UButton
            color="error" icon="i-lucide-trash-2"
            :label="deleting ? 'Deleting…' : 'Delete store'"
            :loading="deleting" :disabled="!canDelete || deleting"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
