<script setup lang="ts">
// DEV-ONLY. Seeds a curated mock Instagram shop and runs the REAL import pipeline
// (analyze → cluster → materialize) so products/theme/branding can be exercised
// without a live Instagram connection. Renders nothing outside dev. Shared by the
// onboarding wizard's Instagram step and the standalone Instagram settings page.
// The matching endpoint is itself prod-guarded (returns 403).
const props = defineProps<{ storeId: string }>()
const emit = defineEmits<{ seeded: [] }>()

const isDev = import.meta.dev
const fixtures = [
  { label: 'Linen clothing boutique', value: 'apparel' },
  { label: 'Handmade jewelry', value: 'jewelry' },
  { label: 'Coffee roaster & cafe', value: 'coffee' },
  { label: 'Ceramics studio', value: 'ceramics' },
]
const selectedFixture = ref('apparel')
const seeding = ref(false)
const msg = ref<string | null>(null)
const msgIsError = ref(false)

// Clear a prior result when the fixture selection changes, so the success line
// never references a shop other than the one currently selected.
watch(selectedFixture, () => {
  msg.value = null
  msgIsError.value = false
})

async function seedFixture() {
  if (!props.storeId) return
  seeding.value = true
  msg.value = null
  msgIsError.value = false
  try {
    const res = await $fetch(`/api/admin/stores/${props.storeId}/ig/seed-fixture`, {
      method: 'POST',
      body: { fixture: selectedFixture.value, reset: true },
    })
    const r = res.result
    msg.value =
      `Seeded “${res.shopName}”: ${r.imported} product${r.imported === 1 ? '' : 's'}` +
      (r.merged ? `, ${r.merged} merged` : '') +
      `, ${r.branding} branding, ${r.needsReview} to review ` +
      `(expected ~${res.expected.products} products / ${res.expected.branding} branding)` +
      (r.usedAi ? '.' : ' — no AI key, used heuristic.')
    emit('seeded')
  } catch (e) {
    msg.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Seed failed'
    msgIsError.value = true
  } finally {
    seeding.value = false
  }
}
</script>

<template>
  <UCard v-if="isDev" :ui="{ root: 'border border-dashed border-warning/40' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-flask-conical" class="size-4 text-warning" />
        <span class="font-medium text-highlighted text-sm">Dev: load a test shop</span>
        <UBadge color="warning" variant="subtle" size="xs" label="local only" class="ml-auto" />
      </div>
    </template>
    <p class="text-sm text-muted">
      Run the full AI import pipeline against a realistic mock Instagram shop — no live connection needed.
      Lands draft products with galleries, categories, and branding posts you can inspect.
    </p>
    <div class="flex flex-wrap items-center gap-3 mt-4">
      <USelect v-model="selectedFixture" :items="fixtures" class="min-w-56" />
      <UButton
        :loading="seeding" :disabled="seeding"
        icon="i-lucide-flask-conical" color="neutral"
        :label="seeding ? 'Seeding…' : 'Load test data'"
        @click="seedFixture"
      />
    </div>
    <UAlert
      v-if="msg" class="mt-4" :color="msgIsError ? 'warning' : 'success'" variant="soft"
      :icon="msgIsError ? 'i-lucide-triangle-alert' : 'i-lucide-circle-check'" :description="msg"
    />
    <p class="text-xs text-dimmed mt-3">
      Re-loading resets that shop's fixture products, then re-imports. Open Products / Theme / Branding to inspect.
    </p>
  </UCard>
</template>
