<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
// When opened from the onboarding wizard, return there instead of the dashboard.
// safeReturnPath rejects off-origin values (open-redirect) and array/duplicate params.
const ret = computed(() => safeReturnPath(route.query.return))
const backTo = computed(() => ret.value ?? '/dashboard')
const backLabel = computed(() => (ret.value ? 'Back to setup' : 'Dashboard'))
const { data, refresh } = await useFetch(`/api/admin/stores/${storeId}/branding`)
const assets = computed(() => data.value?.assets ?? [])
const err = ref<string | null>(null)

async function setHero(id: string, hero: boolean) {
  err.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}/branding/${id}/hero`, { method: 'POST', body: { hero } })
    await refresh()
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Failed'
  }
}
</script>

<template>
  <div class="max-w-4xl">
    <SetupFlowBar current="branding" />
    <UButton v-if="!ret" :to="backTo" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" :label="backLabel" class="px-0" />
    <h1 class="text-2xl font-bold text-highlighted mt-1 mb-1">Branding posts</h1>
    <p class="text-muted text-sm mb-6">
      Non-product Instagram posts captured during import (lifestyle, announcements). Pick one as your storefront hero banner.
    </p>

    <UAlert v-if="err" color="error" variant="soft" :title="err" icon="i-lucide-circle-alert" class="mb-4" />

    <UCard v-if="!assets.length">
      <div class="text-center py-12">
        <UIcon name="i-lucide-images" class="size-10 text-dimmed mx-auto" />
        <p class="mt-3 text-muted">No branding posts yet. Import from Instagram and non-product posts land here.</p>
      </div>
    </UCard>

    <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="a in assets" :key="a.id">
        <UCard variant="outline" class="overflow-hidden">
          <template #header>
            <div class="aspect-square overflow-hidden bg-muted -m-4 mb-0">
              <img v-if="a.public_url" :src="a.public_url" :alt="a.caption ?? ''" class="size-full object-cover">
              <div v-else class="size-full grid place-items-center text-dimmed"><UIcon name="i-lucide-image-off" class="size-6" /></div>
            </div>
          </template>
          <div class="flex items-center gap-2">
            <UBadge :label="a.role" color="neutral" variant="subtle" size="xs" class="capitalize" />
            <UBadge v-if="a.used_as === 'hero'" label="Hero" color="primary" variant="subtle" size="xs" />
            <ULink v-if="a.ig_permalink" :to="a.ig_permalink" target="_blank" external class="ml-auto text-dimmed hover:text-primary">
              <UIcon name="i-lucide-external-link" class="size-4" />
            </ULink>
          </div>
          <p v-if="a.caption" class="mt-2 text-xs text-muted line-clamp-2">{{ a.caption }}</p>
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
