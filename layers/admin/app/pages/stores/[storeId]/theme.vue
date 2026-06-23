<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'
import type { DesignTokens } from '~~/shared/types/theme'
import {
  ALLOWED_BODY_FONTS,
  ALLOWED_BUTTON,
  ALLOWED_DENSITY,
  ALLOWED_HEADING_FONTS,
  ALLOWED_MOOD,
  ALLOWED_RADIUS,
  FALLBACK_THEME,
} from '~~/shared/types/theme'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
// When opened from the onboarding wizard, return there instead of the dashboard.
// safeReturnPath rejects off-origin values (open-redirect) and array/duplicate params.
const ret = computed(() => safeReturnPath(route.query.return))
const backTo = computed(() => ret.value ?? '/dashboard')
const backLabel = computed(() => (ret.value ? 'Back to setup' : 'Dashboard'))
const { data, refresh } = await useFetch(`/api/admin/stores/${storeId}/theme`)
const version = computed(() => data.value?.version ?? null)
const logoUrl = computed(() => data.value?.logoUrl ?? null)
const logoSource = computed(() => data.value?.logo?.source ?? null)
const { storeUrl } = useSurfaceUrls()

// --- editable state, seeded from the active theme ---
const COLOR_KEYS = ['primary', 'secondary', 'accent', 'bg', 'fg', 'muted', 'card', 'border'] as const
type ColorKey = (typeof COLOR_KEYS)[number]
const colors = reactive<Record<ColorKey, string>>({ ...FALLBACK_THEME.palette })
const heading = ref<string>('Inter')
const body = ref<string>('Inter')
const radius = ref<string>('md')
const density = ref<string>('comfortable')
const buttonStyle = ref<string>('solid')
const shadow = ref<string>('subtle')
const mood = ref<string[]>([])

function loadFrom(t: DesignTokens) {
  for (const k of COLOR_KEYS) colors[k] = t.palette[k]
  heading.value = t.typography.heading
  body.value = t.typography.body
  radius.value = t.radius
  density.value = t.density
  buttonStyle.value = t.buttonStyle
  shadow.value = t.shadow
  mood.value = [...t.mood]
}
watch(
  () => data.value?.tokens,
  (t) => {
    if (t) loadFrom(t as DesignTokens)
  },
  { immediate: true },
)

// --- WCAG contrast (client copy of contrast.ts) ---
function lum(hex: string): number {
  const h = hex.replace('#', '')
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!
}
function ratio(a: string, b: string): number {
  const la = lum(a)
  const lb = lum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
const fgContrast = computed(() => ratio(colors.fg, colors.bg))
const mutedContrast = computed(() => ratio(colors.muted, colors.bg))

// Mirrors server bestOn(): the readable on-color the storefront actually paints on a
// filled brand surface (--ui-text-inverted / --t-on-accent). The preview uses these
// so it matches the live store instead of always assuming white text.
function bestOn(bg: string): string {
  return ratio('#ffffff', bg) >= ratio('#111111', bg) ? '#ffffff' : '#111111'
}
const onPrimary = computed(() => bestOn(colors.primary))
const onAccent = computed(() => bestOn(colors.accent))

const opts = (a: readonly string[]) => a.map((v) => ({ label: v, value: v }))

const generating = ref(false)
const saving = ref(false)
const uploading = ref(false)
const msg = ref<string | null>(null)
const err = ref<string | null>(null)

function fail(e: unknown, fallback: string) {
  err.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || fallback
}

async function generate() {
  generating.value = true
  msg.value = null
  err.value = null
  try {
    const res = await $fetch(`/api/admin/stores/${storeId}/theme/generate`, { method: 'POST' })
    msg.value = res.colorFromLogo
      ? `Theme derived from your ${res.logoSource === 'manual' ? 'logo' : 'Instagram profile picture'} — palette, fonts & mood.`
      : res.fallbackUsed
        ? 'No logo or Gemini key found — applied a safe default theme. Connect Instagram or upload a logo for a branded palette.'
        : 'Generated a theme from your shop name.'
    await refresh()
  } catch (e) {
    fail(e, 'Generation failed')
  } finally {
    generating.value = false
  }
}

async function save() {
  saving.value = true
  msg.value = null
  err.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId}/theme`, {
      method: 'PUT',
      body: {
        palette: { ...colors },
        typography: { heading: heading.value, body: body.value },
        radius: radius.value,
        density: density.value,
        buttonStyle: buttonStyle.value,
        shadow: shadow.value,
        mood: mood.value,
      },
    })
    msg.value = 'Theme saved.'
    await refresh()
  } catch (e) {
    fail(e, 'Save failed')
  } finally {
    saving.value = false
  }
}

async function onLogo(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  msg.value = null
  err.value = null
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch(`/api/admin/stores/${storeId}/theme/logo`, { method: 'POST', body: fd })
    msg.value = 'Logo uploaded — palette re-derived from it.'
    await refresh()
  } catch (e) {
    fail(e, 'Logo upload failed')
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <UContainer class="max-w-3xl py-2">
    <SetupFlowBar current="theme" />
    <UButton v-if="!ret" :to="backTo" icon="i-lucide-arrow-left" :label="backLabel" variant="link" color="neutral" size="sm" class="-ml-2.5" />

    <div class="mt-1 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">Theme</h1>
        <p class="text-muted mt-1 text-sm">
          Version {{ version ?? '—' }}. Your whole theme — palette, fonts &amp; mood — is derived from your logo. Edit anything below.
        </p>
      </div>
      <UButton
        v-if="data?.subdomain"
        :to="storeUrl(data.subdomain)" target="_blank" external
        trailing-icon="i-lucide-external-link" label="View storefront"
        variant="link" color="neutral" size="sm"
      />
    </div>

    <UAlert v-if="msg" class="mt-4" color="success" variant="soft" icon="i-lucide-check" :description="msg" />
    <UAlert v-if="err" class="mt-4" color="error" variant="soft" icon="i-lucide-circle-alert" :description="err" />

    <!-- Logo + generate -->
    <UCard class="mt-6">
      <div class="flex items-center gap-4">
        <div class="size-16 shrink-0 rounded-lg border border-default bg-muted overflow-hidden grid place-items-center">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="size-full object-contain">
          <UIcon v-else name="i-lucide-image" class="size-6 text-dimmed" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-medium text-highlighted">Brand logo</p>
          <p class="text-xs text-muted">
            {{ logoSource === 'manual' ? 'Custom upload' : logoSource === 'profile_picture' ? 'From Instagram' : 'No logo yet' }}
            — its dominant color seeds your palette.
          </p>
        </div>
        <UButton as="label" variant="soft" color="neutral" size="sm" icon="i-lucide-upload" :loading="uploading" label="Upload logo" class="cursor-pointer">
          <input type="file" accept="image/*" class="hidden" :disabled="uploading" @change="onLogo">
        </UButton>
        <UButton :loading="generating" :disabled="generating" icon="i-lucide-sparkles" color="primary" label="Regenerate" @click="generate" />
      </div>
    </UCard>

    <div class="mt-6 grid gap-6 md:grid-cols-2">
      <!-- Colors -->
      <UCard>
        <template #header><h2 class="font-semibold text-highlighted">Colors</h2></template>
        <div class="space-y-2.5">
          <div v-for="k in COLOR_KEYS" :key="k" class="flex items-center gap-3">
            <input v-model="colors[k]" type="color" class="size-8 shrink-0 cursor-pointer rounded border border-default bg-transparent">
            <span class="w-20 text-sm capitalize text-muted">{{ k }}</span>
            <UInput v-model="colors[k]" size="sm" class="flex-1 font-mono" />
            <UBadge
              v-if="k === 'fg'"
              :label="fgContrast >= 4.5 ? 'AA' : 'low'"
              :color="fgContrast >= 4.5 ? 'success' : 'warning'" variant="soft" size="xs"
            />
            <UBadge
              v-else-if="k === 'muted'"
              :label="mutedContrast >= 4.5 ? 'AA' : 'low'"
              :color="mutedContrast >= 4.5 ? 'success' : 'warning'" variant="soft" size="xs"
            />
          </div>
          <p class="text-xs text-dimmed">Text colors below AA are auto-corrected on save.</p>
        </div>
      </UCard>

      <!-- Typography & style -->
      <UCard>
        <template #header><h2 class="font-semibold text-highlighted">Typography &amp; style</h2></template>
        <div class="space-y-4">
          <UFormField label="Heading font"><USelect v-model="heading" :items="opts(ALLOWED_HEADING_FONTS)" class="w-full" /></UFormField>
          <UFormField label="Body font"><USelect v-model="body" :items="opts(ALLOWED_BODY_FONTS)" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Corners"><USelect v-model="radius" :items="opts(ALLOWED_RADIUS)" class="w-full" /></UFormField>
            <UFormField label="Density"><USelect v-model="density" :items="opts(ALLOWED_DENSITY)" class="w-full" /></UFormField>
            <UFormField label="Buttons"><USelect v-model="buttonStyle" :items="opts(ALLOWED_BUTTON)" class="w-full" /></UFormField>
            <UFormField label="Shadow"><USelect v-model="shadow" :items="opts(['none', 'subtle', 'pronounced'])" class="w-full" /></UFormField>
          </div>
          <UFormField label="Mood"><USelectMenu v-model="mood" :items="[...ALLOWED_MOOD]" multiple placeholder="Pick up to 4" class="w-full" /></UFormField>
        </div>
      </UCard>
    </div>

    <!-- Preview + save -->
    <UCard class="mt-6">
      <template #header><h2 class="font-semibold text-highlighted">Preview</h2></template>
      <div class="rounded-lg border border-default p-6" :style="{ background: colors.bg, color: colors.fg }">
        <div class="flex items-center gap-3">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="size-10 shrink-0 rounded-full object-cover ring-1 ring-black/10">
          <p class="text-lg font-semibold" :style="{ fontFamily: heading }">{{ data?.subdomain || 'Your store' }}</p>
        </div>
        <p class="mt-2 text-sm" :style="{ color: colors.muted, fontFamily: body }">A preview of your storefront vibe.</p>
        <div class="mt-4 flex gap-2">
          <button class="px-4 py-2 text-sm rounded" :style="{ background: colors.primary, color: onPrimary }">Shop now</button>
          <button class="px-4 py-2 text-sm rounded" :style="{ background: colors.accent, color: onAccent }">Sale</button>
        </div>
      </div>
    </UCard>

    <div class="mt-6 flex items-center gap-3">
      <UButton :loading="saving" :disabled="saving" icon="i-lucide-check" color="primary" label="Save theme" @click="save" />
    </div>
  </UContainer>
</template>
