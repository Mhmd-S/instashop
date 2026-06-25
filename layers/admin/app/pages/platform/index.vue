<script setup lang="ts">
// Superadmin-only: edit the single global platform commission applied to every
// store's checkout. The API (requireSuperadmin) is the real boundary; this page
// guard is UX only.
definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const user = useSupabaseUser()
const isSuperadmin = computed(() => (user.value?.app_metadata as { global_role?: string } | undefined)?.global_role === 'superadmin')
watchEffect(() => { if (user.value && !isSuperadmin.value) navigateTo('/dashboard') })

// Edit as a friendly percentage; convert to/from basis points on the wire.
const pct = ref<number>(0)
const msg = ref<string | null>(null)
const err = ref<string | null>(null)
const busy = ref(false)

const { data, refresh } = useFetch('/api/admin/platform/commission', {
  lazy: true,
  getCachedData: () => undefined,
})
watch(data, (d) => { if (d) pct.value = (d.feeBps ?? 0) / 100 }, { immediate: true })

async function save() {
  err.value = null
  msg.value = null
  busy.value = true
  try {
    const feeBps = Math.round((pct.value || 0) * 100)
    await $fetch('/api/admin/platform/commission', { method: 'PATCH', body: { feeBps } })
    await refresh()
    msg.value = 'Commission updated.'
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not update commission'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UContainer class="max-w-2xl py-2">
    <h1 class="text-2xl font-bold text-highlighted">Platform</h1>
    <p class="text-sm text-muted mt-1">Platform-wide settings for the whole marketplace.</p>

    <UCard class="mt-6">
      <template #header>
        <p class="font-medium text-highlighted">Commission</p>
        <p class="text-sm text-muted">The platform's cut, taken from every sale across all stores.</p>
      </template>

      <UAlert v-if="msg" class="mb-4" color="success" variant="soft" icon="i-lucide-check" :description="msg" />
      <UAlert v-if="err" class="mb-4" color="error" variant="soft" icon="i-lucide-circle-alert" :description="err" />

      <UFormField label="Commission rate" help="e.g. 1.5 = 1.5% taken from every sale.">
        <div class="flex items-center gap-2">
          <UInput
            v-model.number="pct" type="number" :min="0" :max="100" :step="0.1"
            class="w-40" trailing-icon="i-lucide-percent"
          />
          <UButton :loading="busy" :disabled="busy" color="primary" label="Save" icon="i-lucide-save" @click="save" />
        </div>
      </UFormField>
    </UCard>
  </UContainer>
</template>
