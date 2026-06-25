<script setup lang="ts">
import { useClipboard, useShare } from '@vueuse/core'

// The seller's "share your shop" kit: the link to copy, a downloadable QR code,
// quick-share shortcuts, and how to put it in their Instagram bio. Self-contained
// so it drops into the onboarding finish screen and the dashboard share modal alike.
const props = defineProps<{ subdomain: string; storeId: string }>()

const { storeUrl } = useSurfaceUrls()
const url = computed(() => storeUrl(props.subdomain))
const displayUrl = computed(() => url.value.replace(/^https?:\/\//, ''))
const qrSrc = computed(() => `/api/admin/stores/${props.storeId}/qr`)

const { copy, copied } = useClipboard({ source: url, copiedDuring: 2000 })
const { share, isSupported: canShare } = useShare()
function nativeShare() {
  share({ title: 'My shop', text: `Shop with me — ${displayUrl.value}`, url: url.value }).catch(() => {})
}
const waUrl = computed(() => `https://wa.me/?text=${encodeURIComponent(url.value)}`)
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
    <!-- QR -->
    <div class="mx-auto sm:mx-0">
      <div class="rounded-xl border border-default bg-white p-2.5">
        <img :src="qrSrc" alt="QR code to your storefront" width="150" height="150" class="size-[150px]">
      </div>
      <UButton
        :to="`${qrSrc}?download`" external
        size="xs" variant="link" color="neutral" icon="i-lucide-download" label="Download QR"
        class="mt-1.5 w-full justify-center"
      />
    </div>

    <div class="min-w-0 space-y-4">
      <!-- link + copy -->
      <div>
        <p class="mb-1.5 text-xs font-medium text-muted">Your shop link</p>
        <div class="flex items-stretch gap-2">
          <div class="flex min-w-0 flex-1 items-center rounded-lg border border-default bg-elevated px-3 text-sm text-highlighted">
            <span class="truncate">{{ displayUrl }}</span>
          </div>
          <UButton
            :color="copied ? 'success' : 'primary'"
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            :label="copied ? 'Copied' : 'Copy'"
            @click="copy()"
          />
        </div>
      </div>

      <!-- quick actions -->
      <div class="flex flex-wrap gap-2">
        <UButton :to="url" target="_blank" external size="sm" variant="soft" color="neutral" icon="i-lucide-external-link" label="Open" />
        <UButton :to="waUrl" target="_blank" external size="sm" variant="soft" color="neutral" icon="i-lucide-message-circle" label="WhatsApp" />
        <UButton v-if="canShare" size="sm" variant="soft" color="neutral" icon="i-lucide-share-2" label="Share" @click="nativeShare" />
      </div>

      <!-- IG bio guide -->
      <div class="rounded-lg border border-default p-3">
        <p class="flex items-center gap-1.5 text-sm font-medium text-highlighted">
          <UIcon name="i-lucide-instagram" class="size-4 text-primary" /> Add it to your Instagram bio
        </p>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Copy your link above.</li>
          <li>Open Instagram → <strong class="text-highlighted">Edit profile</strong>.</li>
          <li>Paste it into the <strong class="text-highlighted">Website / Links</strong> field.</li>
        </ol>
        <p class="mt-2 text-xs text-dimmed">Tip: add a link sticker to your Stories too.</p>
      </div>
    </div>
  </div>
</template>
