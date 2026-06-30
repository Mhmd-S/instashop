<script setup lang="ts">
import {
  mergeCheckoutConfig,
  BUILTIN_FIELD_LABELS,
  CUSTOM_QUESTION_TYPE_LABELS,
  CUSTOM_QUESTION_TYPES,
  MAX_CHECKOUT_QUESTIONS,
  type CheckoutConfig,
  type CustomQuestion,
  type CustomQuestionType,
} from '~~/shared/types/checkout'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string

const { data } = await useFetch(`/api/admin/stores/${storeId}/checkout`)
const cfg = reactive<CheckoutConfig>(mergeCheckoutConfig(data.value?.config))

const typeItems = CUSTOM_QUESTION_TYPES.map((t) => ({ label: CUSTOM_QUESTION_TYPE_LABELS[t], value: t }))
const builtinLabel = (key: CustomQuestion['key']) => BUILTIN_FIELD_LABELS[key as keyof typeof BUILTIN_FIELD_LABELS] ?? key

const saving = ref(false)
const msg = ref<string | null>(null)
const err = ref<string | null>(null)

function move<T>(arr: T[], i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  const [item] = arr.splice(i, 1)
  arr.splice(j, 0, item!)
}

// Stable local id so Vue keeps element identity across reorder/remove. Matches the
// server key guard (^[a-z0-9-]{8,64}$), so it round-trips and the server keeps it.
function newKey() {
  return globalThis.crypto?.randomUUID?.() ?? `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
function addQuestion() {
  if (cfg.questions.length >= MAX_CHECKOUT_QUESTIONS) return
  cfg.questions.push({ key: newKey(), label: '', type: 'short_text', required: false, position: cfg.questions.length, options: [] })
}
function removeQuestion(i: number) {
  cfg.questions.splice(i, 1)
}
function setType(q: CustomQuestion, t: CustomQuestionType) {
  q.type = t
  if (t === 'single_select' && !(q.options && q.options.length)) q.options = ['']
}
function addOption(q: CustomQuestion) {
  ;(q.options ??= []).push('')
}
function updateOption(q: CustomQuestion, oi: number, v: string) {
  if (q.options) q.options[oi] = v
}
function removeOption(q: CustomQuestion, oi: number) {
  q.options?.splice(oi, 1)
}

// A dropdown must have at least one non-empty option; every question needs a label.
const invalid = computed(() =>
  cfg.questions.some(
    (q) => !q.label.trim() || (q.type === 'single_select' && (q.options ?? []).filter((o) => o.trim()).length < 1),
  ),
)

async function save() {
  if (invalid.value) return
  saving.value = true
  msg.value = null
  err.value = null
  try {
    const res = await $fetch(`/api/admin/stores/${storeId}/checkout`, {
      method: 'PUT',
      body: {
        fields: cfg.fields.map((f, i) => ({ key: f.key, enabled: f.enabled, required: f.enabled && f.required, position: i })),
        questions: cfg.questions.map((q, i) => ({
          key: q.key || undefined,
          label: q.label.trim(),
          type: q.type,
          required: q.required,
          position: i,
          ...(q.type === 'single_select' ? { options: (q.options ?? []).map((o) => o.trim()).filter(Boolean) } : {}),
        })),
      },
    })
    // Re-sync with the server-normalized config (new keys assigned, positions fixed).
    Object.assign(cfg, mergeCheckoutConfig(res.config))
    msg.value = 'Checkout questions saved.'
  } catch (e) {
    err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not save'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UContainer class="max-w-2xl py-2">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Checkout questions</h1>
        <p class="mt-1 text-sm text-ink-muted">Choose what buyers are asked at checkout. Email is always collected and required.</p>
      </div>
      <UButton :loading="saving" :disabled="saving || invalid" label="Save changes" icon="i-lucide-save" class="shadow-card" @click="save" />
    </div>

    <UAlert v-if="msg" class="mt-6" color="success" variant="soft" icon="i-lucide-check" :description="msg" />
    <UAlert v-if="err" class="mt-6" color="error" variant="soft" icon="i-lucide-circle-alert" :description="err" />

    <!-- Built-in fields -->
    <div class="mt-6 rounded-xl border border-default bg-white p-5 sm:p-6">
      <h2 class="text-sm font-semibold text-ink">Standard fields</h2>
      <ul class="mt-3 divide-y divide-default">
        <li class="flex items-center gap-3 py-3 first:pt-0">
          <span class="flex-1 text-sm text-ink">Email</span>
          <UBadge color="neutral" variant="subtle" label="Always required" />
        </li>
        <li v-for="(f, i) in cfg.fields" :key="f.key" class="flex items-center gap-3 py-3 last:pb-0">
          <div class="flex flex-col">
            <UButton icon="i-lucide-chevron-up" size="xs" variant="ghost" color="neutral" :disabled="i === 0" @click="move(cfg.fields, i, -1)" />
            <UButton icon="i-lucide-chevron-down" size="xs" variant="ghost" color="neutral" :disabled="i === cfg.fields.length - 1" @click="move(cfg.fields, i, 1)" />
          </div>
          <span class="flex-1 text-sm text-ink">{{ builtinLabel(f.key) }}</span>
          <label class="flex items-center gap-1.5 text-xs text-ink-muted"><USwitch v-model="f.enabled" size="sm" @update:model-value="(v) => { if (!v) f.required = false }" /> Show</label>
          <label class="flex items-center gap-1.5 text-xs text-ink-muted"><USwitch v-model="f.required" :disabled="!f.enabled" size="sm" /> Required</label>
        </li>
      </ul>
    </div>

    <!-- Custom questions -->
    <div class="mt-6 rounded-xl border border-default bg-white p-5 sm:p-6">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-ink">Custom questions</h2>
        <UButton
          icon="i-lucide-plus" size="xs" color="neutral" variant="soft" label="Add question"
          :disabled="cfg.questions.length >= MAX_CHECKOUT_QUESTIONS" @click="addQuestion"
        />
      </div>

      <p v-if="!cfg.questions.length" class="mt-3 text-sm text-ink-muted">
        No custom questions yet. Add one to collect extra details (e.g. a gift message or delivery instructions).
      </p>

      <div v-for="(q, i) in cfg.questions" :key="q.key" class="mt-3 space-y-3 rounded-lg border border-default p-4 last:mb-0">
        <div class="flex items-start gap-2">
          <div class="flex flex-col pt-6">
            <UButton icon="i-lucide-chevron-up" size="xs" variant="ghost" color="neutral" :disabled="i === 0" @click="move(cfg.questions, i, -1)" />
            <UButton icon="i-lucide-chevron-down" size="xs" variant="ghost" color="neutral" :disabled="i === cfg.questions.length - 1" @click="move(cfg.questions, i, 1)" />
          </div>
          <UFormField label="Question" class="flex-1">
            <UInput v-model="q.label" placeholder="e.g. Gift message" class="w-full" />
          </UFormField>
          <UFormField label="Type">
            <USelect :model-value="q.type" :items="typeItems" class="w-40" @update:model-value="(v) => setType(q, v as CustomQuestionType)" />
          </UFormField>
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" class="mt-6" @click="removeQuestion(i)" />
        </div>

        <div v-if="q.type === 'single_select' && q.options" class="space-y-2 ps-10">
          <p class="text-xs font-medium text-ink-muted">Options</p>
          <div v-for="(opt, oi) in q.options" :key="oi" class="flex items-center gap-2">
            <UInput :model-value="opt" placeholder="Option" class="flex-1" @update:model-value="(v) => updateOption(q, oi, v as string)" />
            <UButton icon="i-lucide-x" size="xs" variant="ghost" color="neutral" :disabled="(q.options?.length ?? 0) <= 1" @click="removeOption(q, oi)" />
          </div>
          <UButton icon="i-lucide-plus" size="xs" variant="link" color="neutral" label="Add option" @click="addOption(q)" />
        </div>

        <label class="flex items-center gap-1.5 text-xs text-ink-muted ps-10"><USwitch v-model="q.required" size="sm" /> Required</label>
      </div>
    </div>

    <div class="mt-6 flex justify-end">
      <UButton :loading="saving" :disabled="saving || invalid" label="Save changes" icon="i-lucide-save" class="shadow-card" @click="save" />
    </div>
  </UContainer>
</template>
