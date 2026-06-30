<script setup lang="ts">
// Self-contained branding review: the grid of non-product posts captured during
// the IG import, with hero selection. Rendered on the standalone Branding page and
// inline in the onboarding wizard. Non-blocking fetch so it can mount lazily.
const props = defineProps<{ storeId: string }>()

const { data, refresh, pending } = useFetch(`/api/admin/stores/${props.storeId}/branding`, {
  lazy: true,
  getCachedData: () => undefined,
})
const assets = computed(() => data.value?.assets ?? [])
const err = ref<string | null>(null)

async function setHero(id: string, hero: boolean) {
  err.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/branding/${id}/hero`, { method: 'POST', body: { hero } })
    await refresh()
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Failed'
  }
}
</script>

<template>
  <div>
    <UAlert v-if="err" color="error" variant="soft" :title="err" icon="i-lucide-circle-alert" class="mb-4" />

    <div v-if="pending && !assets.length" class="grid place-items-center rounded-xl border border-default bg-white py-10 text-ink-subtle">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
    </div>

    <div v-else-if="!assets.length" class="rounded-xl border border-default bg-white py-12 text-center">
      <UIcon name="i-lucide-images" class="mx-auto size-8 text-ink-subtle" />
      <p class="mt-2 text-sm text-ink-muted">No branding posts yet. Import from Instagram and non-product posts land here.</p>
    </div>

    <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="a in assets" :key="a.id">
        <UCard variant="outline" class="overflow-hidden">
          <template #header>
            <div class="aspect-square overflow-hidden bg-black/5 -m-4 mb-0">
              <img v-if="a.public_url" :src="a.public_url" :alt="a.caption ?? ''" class="size-full object-cover">
              <div v-else class="size-full grid place-items-center text-ink-subtle"><UIcon name="i-lucide-image-off" class="size-6" /></div>
            </div>
          </template>
          <div class="flex items-center gap-2">
            <UBadge :label="a.role" color="neutral" variant="subtle" size="xs" class="capitalize" />
            <UBadge v-if="a.used_as === 'hero'" label="Hero" color="primary" variant="subtle" size="xs" />
            <ULink v-if="a.ig_permalink" :to="a.ig_permalink" target="_blank" external class="ml-auto text-ink-subtle hover:text-primary">
              <UIcon name="i-lucide-external-link" class="size-4" />
            </ULink>
          </div>
          <p v-if="a.caption" class="mt-2 text-xs text-ink-muted line-clamp-2">{{ a.caption }}</p>
          <UButton
            v-if="a.used_as === 'hero'"
            class="mt-3" block size="xs" color="neutral" variant="soft" icon="i-lucide-x" label="Remove as hero"
            @click="setHero(a.id, false)"
          />
          <UButton
            v-else
            class="mt-3" block size="xs" color="primary" variant="soft" icon="i-lucide-image-up" label="Use as hero"
            @click="setHero(a.id, true)"
          />
        </UCard>
      </li>
    </ul>
  </div>
</template>
