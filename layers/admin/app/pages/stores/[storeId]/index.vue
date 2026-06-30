<script setup lang="ts">
definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
const { storeUrl } = useSurfaceUrls()

const { data } = await useFetch(`/api/admin/stores/${storeId}`)
const store = computed(() => data.value?.store ?? null)
const publicUrl = computed(() => (store.value ? storeUrl(store.value.subdomain) : ''))

// Share flow — opens the shop link / QR / bio guide.
const shareOpen = ref(false)

// Delete flow — type-to-confirm so an owner can't nuke a store by misclick.
const deleteOpen = ref(false)
const confirmText = ref('')
const deleting = ref(false)
const delError = ref<string | null>(null)

watch(deleteOpen, () => {
  confirmText.value = ''
  delError.value = null
})
const canDelete = computed(
  () => !!store.value && confirmText.value.trim().toLowerCase() === store.value.subdomain.toLowerCase(),
)

async function confirmDelete() {
  if (!store.value || !canDelete.value) return
  deleting.value = true
  delError.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}`, {
      method: 'DELETE',
      body: { confirm: confirmText.value.trim() },
    })
    // Drop the deleted store from the shared switcher list before leaving.
    await refreshNuxtData('admin-stores')
    await navigateTo('/dashboard')
  } catch (e) {
    delError.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Failed to delete store'
    deleting.value = false
  }
}
</script>

<template>
  <div v-if="store">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-cap font-medium uppercase tracking-[0.12em] text-ink-subtle">Store settings</p>
        <div class="mt-1.5 flex items-center gap-2.5">
          <h1 class="text-h2 font-semibold text-ink">{{ store.name }}</h1>
          <span
            class="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize"
            :class="store.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-ink/10 text-ink-muted'"
          >{{ store.status }}</span>
        </div>
      </div>
      <UButton
        :to="`/onboarding?store=${store.id}`" color="neutral" variant="soft"
        icon="i-lucide-wand-2" label="Setup guide"
      />
    </div>

    <!-- Storefront -->
    <div class="mt-6 rounded-card border border-default bg-white p-5 shadow-card sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="text-cap font-medium uppercase tracking-[0.12em] text-ink-subtle">Storefront</p>
          <a :href="publicUrl" target="_blank" rel="noopener" class="mt-1 block truncate font-medium text-ink hover:text-primary">
            {{ store.subdomain }}
          </a>
        </div>
        <div class="flex items-center gap-2">
          <UButton :to="publicUrl" target="_blank" external color="neutral" variant="soft" icon="i-lucide-external-link" label="View" />
          <UButton color="primary" icon="i-lucide-share-2" label="Share" class="shadow-card" @click="shareOpen = true" />
        </div>
      </div>
    </div>

    <!-- Danger zone -->
    <div v-if="store.role === 'owner'" class="mt-6 rounded-card border border-error/30 bg-white p-5 shadow-card sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="font-semibold text-ink">Delete store</p>
          <p class="mt-0.5 text-sm text-ink-muted">Permanently remove this store and all of its data.</p>
        </div>
        <UButton color="error" variant="soft" icon="i-lucide-trash-2" label="Delete store" @click="deleteOpen = true" />
      </div>
    </div>

    <UModal v-model:open="shareOpen" :title="`Share ${store.name}`">
      <template #body>
        <ShareKit :subdomain="store.subdomain" :store-id="store.id" />
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" :title="`Delete ${store.name}?`" :dismissible="!deleting">
      <template #body>
        <div class="space-y-4">
          <UAlert
            color="error" variant="subtle" icon="i-lucide-triangle-alert"
            title="This permanently deletes the store"
            description="Products, orders, categories, theme, branding, the Instagram connection, and every uploaded image are removed. This can't be undone."
          />
          <p class="text-sm text-ink-muted">
            Type <strong class="text-ink">{{ store.subdomain }}</strong> to confirm.
          </p>
          <UInput
            v-model="confirmText" autofocus autocomplete="off" class="w-full"
            :placeholder="store.subdomain"
            @keydown.enter="confirmDelete"
          />
          <UAlert v-if="delError" color="error" variant="soft" :title="delError" icon="i-lucide-circle-alert" />
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Cancel" :disabled="deleting" @click="deleteOpen = false" />
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
