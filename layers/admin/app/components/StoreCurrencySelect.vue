<script setup lang="ts">
import { SUPPORTED_CURRENCIES } from '~~/shared/types/currency'

// Store currency picker. Changing it relabels the whole catalogue (server side),
// so the parent should refresh its product list on @changed.
const props = defineProps<{ storeId: string }>()
const emit = defineEmits<{ changed: [string] }>()

const { data, refresh } = useFetch(`/api/admin/stores/${props.storeId}/settings`, {
  lazy: true,
  getCachedData: () => undefined,
})
const currency = ref('USD')
watch(
  () => data.value?.baseCurrency,
  (c) => {
    if (c) currency.value = c
  },
  { immediate: true },
)

const items = SUPPORTED_CURRENCIES.map((c) => ({ label: c.label, value: c.code }))
const saving = ref(false)
const toast = useToast()

async function onChange(code: string) {
  const prev = data.value?.baseCurrency ?? 'USD'
  if (!code || code === prev) return
  saving.value = true
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/settings`, { method: 'PATCH', body: { baseCurrency: code } })
    await refresh()
    emit('changed', code)
    toast.add({ title: `Currency set to ${code}`, description: 'All prices were relabelled.', icon: 'i-lucide-check', color: 'success' })
  } catch (e) {
    currency.value = prev // revert the select
    toast.add({
      title: 'Could not update currency',
      description: (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Please try again.',
      icon: 'i-lucide-circle-alert',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
    <div class="flex items-center gap-3">
      <div class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <UIcon name="i-lucide-badge-dollar-sign" class="size-4" />
      </div>
      <div>
        <p class="text-sm font-medium text-highlighted">Store currency</p>
        <p class="text-xs text-muted">Applies to every price — relabels, doesn't convert amounts.</p>
      </div>
    </div>
    <USelect
      v-model="currency" :items="items" value-key="value" :loading="saving" :disabled="saving"
      icon="i-lucide-coins" class="w-full sm:w-60" @update:model-value="onChange"
    />
  </div>
</template>
