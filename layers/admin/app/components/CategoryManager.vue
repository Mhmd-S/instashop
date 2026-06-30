<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { CategoryWithCount } from '~~/shared/types/category'

// Inline categories editor shown as a row of editable chips: each chip carries its
// product count, an inline rename, and a per-chip menu (rename / merge / delete);
// a dashed "Add category" chip creates new ones. Reads the shared store-categories
// list (useStoreCategories) so changes reflect instantly in product assign
// dropdowns. Used inline in onboarding and on the standalone Categories page.
const props = withDefaults(defineProps<{ storeId: string; withHeader?: boolean }>(), { withHeader: true })

const { data, refresh, pending } = useStoreCategories(() => props.storeId)
const categories = computed(() => data.value?.categories ?? [])

const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
function fail(e: unknown, fallback: string) {
  error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || fallback
}

// --- add ---
const adding = ref(false)
const newName = ref('')
const creating = ref(false)
function startAdd() {
  cancelRename()
  adding.value = true
  newName.value = ''
  error.value = null
}
function cancelAdd() {
  adding.value = false
  newName.value = ''
}
async function create() {
  const name = newName.value.trim()
  if (!name) return
  creating.value = true
  error.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/categories`, { method: 'POST', body: { name } })
    newName.value = ''
    await refresh()
  } catch (e) {
    fail(e, 'Could not create category')
  } finally {
    creating.value = false
  }
}

// --- inline rename ---
const editingId = ref<string | null>(null)
const editName = ref('')
function startRename(c: CategoryWithCount) {
  cancelAdd()
  editingId.value = c.id
  editName.value = c.name
  error.value = null
}
function cancelRename() {
  editingId.value = null
  editName.value = ''
}
async function saveRename(c: CategoryWithCount) {
  const name = editName.value.trim()
  if (!name || name === c.name) {
    cancelRename()
    return
  }
  busyId.value = c.id
  error.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/categories/${c.id}`, { method: 'PATCH', body: { name } })
    cancelRename()
    await refresh()
  } catch (e) {
    fail(e, 'Rename failed')
  } finally {
    busyId.value = null
  }
}

// --- delete ---
async function remove(c: CategoryWithCount) {
  if (!confirm(`Delete "${c.name}"? Products keep existing — they just lose this category.`)) return
  busyId.value = c.id
  error.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/categories/${c.id}`, { method: 'DELETE' })
    await refresh()
  } catch (e) {
    fail(e, 'Delete failed')
  } finally {
    busyId.value = null
  }
}

// --- merge (modal picker, no slug typing) ---
const mergeOpen = ref(false)
const mergeSource = ref<CategoryWithCount | null>(null)
const mergeTargetId = ref<string | null>(null)
const merging = ref(false)
const mergeError = ref<string | null>(null)
const mergeTargets = computed(() =>
  categories.value.filter((c) => c.id !== mergeSource.value?.id).map((c) => ({ label: c.name, value: c.id })),
)
function openMerge(c: CategoryWithCount) {
  if (categories.value.length < 2) {
    error.value = 'Add another category first — merging needs somewhere to merge into.'
    return
  }
  mergeSource.value = c
  mergeTargetId.value = null
  mergeError.value = null
  mergeOpen.value = true
}
async function confirmMerge() {
  if (!mergeSource.value || !mergeTargetId.value) return
  merging.value = true
  mergeError.value = null
  try {
    await $fetch(`/api/admin/stores/${props.storeId}/categories/${mergeSource.value.id}/merge`, {
      method: 'POST',
      body: { target_id: mergeTargetId.value },
    })
    mergeOpen.value = false
    await refresh()
  } catch (e) {
    mergeError.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Merge failed'
  } finally {
    merging.value = false
  }
}

function menuItems(c: CategoryWithCount): DropdownMenuItem[][] {
  return [
    [
      { label: 'Rename', icon: 'i-lucide-pencil', onSelect: () => startRename(c) },
      { label: 'Merge into…', icon: 'i-lucide-merge', onSelect: () => openMerge(c) },
    ],
    [{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => remove(c) }],
  ]
}
</script>

<template>
  <div>
    <div v-if="withHeader" class="flex items-center gap-3 mb-3">
      <div class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <UIcon name="i-lucide-tags" class="size-4" />
      </div>
      <div>
        <p class="text-sm font-medium text-ink">Categories</p>
        <p class="text-xs text-ink-muted">Group products into collections shoppers can browse.</p>
      </div>
    </div>

    <div v-if="pending && !categories.length" class="flex items-center gap-2 py-2 text-sm text-ink-subtle">
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Loading…
    </div>

    <div v-else class="flex flex-wrap items-center gap-2">
      <template v-for="c in categories" :key="c.id">
        <!-- inline rename -->
        <div v-if="editingId === c.id" class="inline-flex items-center gap-1">
          <UInput
            v-model="editName"
            size="sm"
            autofocus
            class="w-36"
            :disabled="busyId === c.id"
            @keydown.enter.prevent="saveRename(c)"
            @keydown.esc="cancelRename"
          />
          <UButton size="xs" color="primary" variant="soft" icon="i-lucide-check" :loading="busyId === c.id" title="Save" @click="saveRename(c)" />
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" :disabled="busyId === c.id" title="Cancel" @click="cancelRename" />
        </div>

        <!-- chip -->
        <div
          v-else
          class="inline-flex items-center gap-2 rounded-lg border border-default bg-white py-1 pl-3 pr-1 transition hover:bg-black/5"
          :class="{ 'opacity-50': busyId === c.id }"
        >
          <span class="text-sm font-medium text-ink">{{ c.name }}</span>
          <span v-if="c.product_count" class="rounded-full bg-black/5 px-1.5 text-xs text-ink-muted tabular-nums">{{ c.product_count }}</span>
          <UDropdownMenu :items="menuItems(c)" :content="{ align: 'end' }">
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-ellipsis-vertical"
              :loading="busyId === c.id"
              :title="`Edit ${c.name}`"
            />
          </UDropdownMenu>
        </div>
      </template>

      <!-- add -->
      <div v-if="adding" class="inline-flex items-center gap-1">
        <UInput
          v-model="newName"
          size="sm"
          autofocus
          placeholder="Category name"
          class="w-40"
          :disabled="creating"
          @keydown.enter.prevent="create"
          @keydown.esc="cancelAdd"
        />
        <UButton size="xs" color="primary" variant="soft" icon="i-lucide-check" :loading="creating" :disabled="!newName.trim()" title="Add" @click="create" />
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" :disabled="creating" title="Cancel" @click="cancelAdd" />
      </div>
      <button
        v-else
        type="button"
        class="inline-flex items-center gap-1 rounded-lg border border-dashed border-default px-3 py-1.5 text-sm text-ink-muted transition hover:border-primary hover:text-primary"
        @click="startAdd"
      >
        <UIcon name="i-lucide-plus" class="size-4" />
        Add category
      </button>
    </div>

    <p v-if="!pending && !categories.length && !adding" class="mt-2 text-xs text-ink-subtle">
      No categories yet — add one, or let an Instagram import suggest them.
    </p>

    <UAlert v-if="error" color="error" variant="soft" :title="error" icon="i-lucide-circle-alert" class="mt-3" />

    <UModal v-model:open="mergeOpen" :title="`Merge “${mergeSource?.name}” into…`" :dismissible="!merging">
      <template #body>
        <p class="text-sm text-ink-muted mb-3">
          Products in <span class="font-medium text-ink">{{ mergeSource?.name }}</span> move to the category you pick, then
          “{{ mergeSource?.name }}” is removed.
        </p>
        <USelect v-model="mergeTargetId" :items="mergeTargets" value-key="value" placeholder="Choose a category" class="w-full" />
        <UAlert v-if="mergeError" color="error" variant="soft" :title="mergeError" icon="i-lucide-circle-alert" class="mt-3" />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Cancel" :disabled="merging" @click="mergeOpen = false" />
          <UButton
            color="primary"
            icon="i-lucide-merge"
            :label="merging ? 'Merging…' : 'Merge'"
            :loading="merging"
            :disabled="!mergeTargetId || merging"
            @click="confirmMerge"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
