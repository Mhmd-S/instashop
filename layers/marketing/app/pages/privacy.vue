<script setup lang="ts">
import { BRAND, LEGAL } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Privacy Policy — ${BRAND.name}`,
  description: `How ${BRAND.name} collects, uses, shares and protects personal information, including Instagram data, payments and AI processing.`,
  robots: 'index, follow',
})
</script>

<template>
  <LegalPage title="Privacy Policy" :updated="LEGAL.effectiveDate">
    <p>
      This Privacy Policy explains how <strong>{{ LEGAL.entity }}</strong> (“{{ BRAND.name }}”, “we”, “us”)
      collects, uses, shares and protects personal information when you use the {{ BRAND.name }} website,
      the seller dashboard, and the online storefronts we host on behalf of our sellers (together, the
      “Service”). By using the Service you agree to this Policy.
    </p>

    <h2>1. Our role</h2>
    <p>
      {{ BRAND.name }} is a software platform that lets a business owner (“Seller”) connect their own
      Instagram account, import their posts as products, and run a hosted online store. For a Seller’s
      <strong>account data</strong> we act as a data controller. For the <strong>shoppers</strong> (“Buyers”)
      who place orders on a Seller’s storefront, we generally process that information as a
      <strong>processor on behalf of the Seller</strong>, who is the controller of their own customer data.
    </p>

    <h2>2. Information we collect</h2>
    <h3>From Sellers</h3>
    <ul>
      <li><strong>Account details</strong> — name, email address, and authentication credentials.</li>
      <li><strong>Store configuration</strong> — store name, subdomain, theme, products, categories and settings you create.</li>
      <li><strong>Payment onboarding</strong> — when you connect Stripe, Stripe collects your business and
        banking details directly; we store only your connected-account identifier and capability status, never your full bank or card numbers.</li>
    </ul>
    <h3>From Instagram (only if you connect it)</h3>
    <ul>
      <li><strong>Profile</strong> — your Instagram user ID, username, account type, profile picture and media count.</li>
      <li><strong>Your media</strong> — the images, captions, permalinks and timestamps of posts on the
        account you connect, which we import to create draft products and branding for your store.</li>
      <li><strong>Access token</strong> — a token that lets us read the above on your behalf, stored encrypted.</li>
    </ul>
    <h3>From Buyers (on a Seller’s storefront)</h3>
    <ul>
      <li><strong>Order information</strong> — name, contact details, delivery address, items ordered and any
        answers to a Seller’s checkout questions.</li>
      <li><strong>Payment</strong> — card payments are processed by Stripe; {{ BRAND.name }} does not receive
        or store full card numbers.</li>
    </ul>
    <h3>Automatically</h3>
    <ul>
      <li><strong>Technical data</strong> — IP address, browser/device information and log data.</li>
      <li><strong>Cookies</strong> — strictly-necessary session cookies (see §8).</li>
    </ul>

    <h2>3. How we use information</h2>
    <ul>
      <li>To provide and operate the Service — including importing your Instagram posts, generating product
        drafts and branding, and hosting your storefront.</li>
      <li>To process and fulfil orders placed on Seller storefronts.</li>
      <li>To communicate with you (e.g. order notifications, service messages).</li>
      <li>To secure the Service, prevent abuse, and comply with legal obligations.</li>
      <li>To maintain and improve the Service.</li>
    </ul>

    <h2>4. Instagram / Meta data</h2>
    <p>
      When you connect Instagram, we request the <code>instagram_business_basic</code> permission, which
      lets us <strong>read your own profile and media</strong>. We use this solely to import your posts as
      products and to brand your store. We <strong>do not</strong> post on your behalf, access other users’
      data, or use your data for advertising. Our use of information received from the Meta/Instagram APIs
      follows the Meta Platform Terms and applicable Developer Policies.
    </p>
    <p>
      You stay in control: you can disconnect Instagram in your dashboard at any time, or remove
      {{ BRAND.name }} from your Instagram “Apps and websites” settings. Both revoke our access. See
      <NuxtLink to="/data-deletion">Data Deletion</NuxtLink> for how to remove imported data.
    </p>

    <h2>5. AI processing</h2>
    <p>
      To turn posts into useful products, the captions and images you import may be processed by
      third-party AI providers (such as Google) to suggest product titles, descriptions and categories and
      to detect non-product (“branding”) posts. This processing is performed to operate the Service; we do
      not authorise these providers to use your content to train their general models beyond what is
      necessary to return a result, and we send only the content needed for the feature.
    </p>

    <h2>6. How we share information</h2>
    <p>We do not sell personal information. We share it only with service providers that help us run the
      Service, under appropriate contractual safeguards:</p>
    <ul>
      <li><strong>Supabase</strong> — database, file storage and authentication.</li>
      <li><strong>Stripe</strong> — payment processing and Seller payouts (Stripe Connect).</li>
      <li><strong>Meta / Instagram</strong> — the source of imported content, via its APIs.</li>
      <li><strong>AI providers (e.g. Google)</strong> — to analyse imported content as described in §5.</li>
      <li><strong>Email provider</strong> — to send transactional messages (e.g. order notifications).</li>
      <li><strong>Hosting/infrastructure</strong> — to serve the website and storefronts.</li>
    </ul>
    <p>We may also disclose information where required by law, to enforce our terms, or in connection with a
      merger or acquisition.</p>

    <h2>7. Data retention</h2>
    <p>
      We keep personal information for as long as your account is active or as needed to provide the
      Service, then delete or anonymise it, except where we must retain certain records (e.g. financial and
      tax records) to comply with the law. See <NuxtLink to="/data-deletion">Data Deletion</NuxtLink> for
      deletion requests and timelines.
    </p>

    <h2>8. Cookies</h2>
    <p>
      We use strictly-necessary cookies to keep you signed in to the seller dashboard and to operate the
      storefront (for example, your shopping cart is stored locally in your browser). We do not use
      third-party advertising or cross-site tracking cookies.
    </p>

    <h2>9. Security</h2>
    <p>
      We use industry-standard measures — including encryption in transit, encrypted storage of access
      tokens, and access controls — to protect your information. No method of transmission or storage is
      completely secure, and we cannot guarantee absolute security.
    </p>

    <h2>10. International transfers</h2>
    <p>
      Your information may be processed in countries other than your own. Where required, we rely on
      appropriate safeguards for such transfers.
    </p>

    <h2>11. Your rights</h2>
    <p>
      Depending on where you live, you may have the right to access, correct, delete, export, or restrict
      the processing of your personal information, and to object to certain processing. You can exercise
      these rights in your dashboard, by disconnecting Instagram, by following
      <NuxtLink to="/data-deletion">Data Deletion</NuxtLink>, or by contacting us at
      <strong>{{ LEGAL.contactEmail }}</strong>.
    </p>

    <h2>12. Children</h2>
    <p>The Service is not directed to children, and we do not knowingly collect personal information from
      children under the age required by your local law.</p>

    <h2>13. Changes to this Policy</h2>
    <p>We may update this Policy from time to time. Material changes will be reflected by updating the “Last
      updated” date above and, where appropriate, by additional notice.</p>

    <h2>14. Contact us</h2>
    <p>
      {{ LEGAL.entity }}<br>
      {{ LEGAL.address }}<br>
      {{ LEGAL.contactEmail }}
    </p>

    <hr>
    <p class="text-sm">
      This document is a template tailored to {{ BRAND.name }}’s data practices and is provided for
      convenience. It is not legal advice; please have it reviewed by qualified counsel and complete the
      bracketed details before publishing.
    </p>
  </LegalPage>
</template>
