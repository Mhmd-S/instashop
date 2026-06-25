<script setup lang="ts">
import { BRAND, LEGAL } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Data Deletion — ${BRAND.name}`,
  description: `How to disconnect Instagram and delete your data from ${BRAND.name}.`,
  robots: 'index, follow',
})
</script>

<template>
  <LegalPage title="Data Deletion" :updated="LEGAL.effectiveDate">
    <p>
      You can remove your data from {{ BRAND.name }} at any time. This page explains how, what gets deleted,
      and how long it takes. For the full picture of how we handle data, see our
      <NuxtLink to="/privacy">Privacy Policy</NuxtLink>.
    </p>

    <h2>Option 1 — Disconnect Instagram in your dashboard</h2>
    <p>
      In the seller dashboard, open <strong>Instagram</strong> and choose <strong>Disconnect</strong>. This
      immediately revokes our access and deletes the stored access token and the connected-account record.
      You can keep or delete the products that were imported from your posts.
    </p>

    <h2>Option 2 — Remove {{ BRAND.name }} from Instagram</h2>
    <p>
      In the Instagram app, go to <strong>Settings → Apps and websites</strong> and remove
      {{ BRAND.name }}. Instagram notifies us automatically (a signed “deauthorize” request), and we revoke
      the connection and free the stored token. To also remove the data we imported, use Option 1 or 3, or
      submit a deletion request below.
    </p>

    <h2>Option 3 — Delete your account or request full deletion</h2>
    <p>
      To delete your store and account data, delete the store from your dashboard, or email us at
      <strong>{{ LEGAL.contactEmail }}</strong> from the address on your account and ask us to delete your
      data. We will verify the request and process it.
    </p>

    <h2>Instagram data-deletion requests</h2>
    <p>
      When you request deletion through Instagram, Meta sends us a signed deletion request. We then
      hard-delete your Instagram-sourced data — the connected-account record and the products and branding
      imported from your Instagram posts — and provide a <strong>confirmation code</strong> and a status URL
      so you (and Meta) can verify completion.
    </p>

    <h2>What gets deleted</h2>
    <ul>
      <li>Your Instagram access token and connected-account record.</li>
      <li>Profile details imported from Instagram (username, profile picture, etc.).</li>
      <li>Products and branding assets created from your imported posts (on full-deletion requests).</li>
    </ul>

    <h2>What we may retain</h2>
    <p>
      We may retain limited records where we are legally required to — for example, order and financial
      records needed for tax and accounting — and anonymised or aggregated data that no longer identifies
      you. These are kept only as long as the law requires.
    </p>

    <h2>How long it takes</h2>
    <p>
      Disconnecting Instagram and deauthorisation take effect immediately. Full deletion requests are
      completed promptly and, in any case, within 30 days, subject to the legal-retention exceptions above.
    </p>

    <h2>Contact</h2>
    <p>
      Questions about deleting your data? Contact us at <strong>{{ LEGAL.contactEmail }}</strong>.
    </p>

    <hr>
    <p class="text-sm">
      This page documents {{ BRAND.name }}’s data-deletion process. Complete the bracketed contact details
      before publishing.
    </p>
  </LegalPage>
</template>
