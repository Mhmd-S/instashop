<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'
import type { CategoryWithCount } from '~~/shared/types/category'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
// When opened from the onboarding wizard, return there instead of the dashboard.
// safeReturnPath rejects off-origin values (open-redirect) and array/duplicate params.
const ret = computed(() => safeReturnPath(route.query.return))
const backTo = computed(() => ret.value ?? '/dashboard')
const backLabel = computed(() => (ret.value ? 'Back to setup' : 'Dashboard'))
const { data, refresh } = await useFetch(`/api/admin/stores/${storeId}/categories`)
const categories = computed(() => data.value?.categories ?? [])

const newName = ref('')
const creating = ref(false)
const error = ref<string | null>(null)

function fail(e: unknown, fallback: string) {
  error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || fallback
}

async function create() {
  if (!newName.value.trim()) return
  creating.value = true
  error.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}/categories`, { method: 'POST', body: { name: newName.value.trim() } })
    newName.value = ''
    await refresh()
  } catch (e) {
    fail(e, 'Could not create category')
  } finally {
    creating.value = false
  }
}

async function rename(c: CategoryWithCount) {
  const name = prompt('Rename category', c.name)
  if (!name || name.trim() === c.name) return
  try {
    await $fetch(`/api/admin/stores/${storeId}/categories/${c.id}`, { method: 'PATCH', body: { name: name.trim() } })
    await refresh()
  } catch (e) {
    fail(e, 'Rename failed')
  }
}

async function remove(c: CategoryWithCount) {
  if (!confirm(`Delete "${c.name}"? Products keep existing — they just lose this category.`)) return
  try {
    await $fetch(`/api/admin/stores/${storeId}/categories/${c.id}`, { method: 'DELETE' })
    await refresh()
  } catch (e) {
    fail(e, 'Delete failed')
  }
}

async function merge(c: CategoryWithCount) {
  const others = categories.value.filter((x) => x.id !== c.id)
  if (!others.length) {
    alert('You need another category to merge into.')
    return
  }
  const target = prompt(
    `Merge "${c.name}" into which category? Enter its slug:\n\n` + others.map((o) => `• ${o.slug}  (${o.name})`).join('\n'),
  )
  if (!target) return
  const t = others.find((o) => o.slug === target.trim())
  if (!t) {
    alert('No category with that slug.')
    return
  }
  try {
    await $fetch(`/api/admin/stores/${storeId}/categories/${c.id}/merge`, { method: 'POST', body: { target_id: t.id } })
    await refresh()
  } catch (e) {
    fail(e, 'Merge failed')
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <SetupFlowBar current="products" />
    <UButton v-if="!ret" :to="backTo" variant="link" color="neutral" size="xs" icon="i-lucide-arrow-left" :label="backLabel" class="px-0" />
    <h1 class="text-2xl font-bold text-highlighted mt-1 mb-6">Categories</h1>

    <UCard class="mb-6">
      <form class="flex items-end gap-3" @submit.prevent="create">
        <UFormField label="New category" name="name" class="flex-1">
          <UInput v-model="newName" placeholder="e.g. Dresses" class="w-full" />
        </UFormField>
        <UButton type="submit" :loading="creating" :disabled="creating || !newName.trim()" icon="i-lucide-plus" label="Add" />
      </form>
      <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" class="mt-3" />
    </UCard>

    <UCard v-if="!categories.length">
      <div class="text-center py-12">
        <UIcon name="i-lucide-tags" class="size-10 text-dimmed mx-auto" />
        <p class="mt-3 text-muted">No categories yet. Add one above, or let an Instagram import suggest them.</p>
      </div>
    </UCard>

    <ul v-else class="divide-y divide-default rounded-lg border border-default">
      <li v-for="c in categories" :key="c.id" class="flex items-center gap-3 px-4 py-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-medium text-highlighted truncate">{{ c.name }}</span>
            <UBadge v-if="c.source === 'ai'" label="AI" color="primary" variant="soft" size="xs" />
          </div>
          <p class="text-xs text-muted">/{{ c.slug }} · {{ c.product_count }} product{{ c.product_count === 1 ? '' : 's' }}</p>
        </div>
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" title="Rename" @click="rename(c)" />
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-merge" title="Merge into…" @click="merge(c)" />
        <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" title="Delete" @click="remove(c)" />
      </li>
    </ul>
  </div>
</template>
