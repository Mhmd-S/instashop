<script setup lang="ts">
import { BRAND, LEGAL } from '~~/shared/brand'

definePageMeta({ surface: 'marketing' })
useSeoMeta({
  title: `Terms of Service — ${BRAND.name}`,
  description: `The terms that govern your use of ${BRAND.name}, the Instagram-to-storefront platform.`,
  robots: 'index, follow',
})
</script>

<template>
  <LegalPage title="Terms of Service" :updated="LEGAL.effectiveDate">
    <p>
      These Terms of Service (“Terms”) govern your access to and use of the {{ BRAND.name }} website, seller
      dashboard, and hosted storefronts (the “Service”), provided by <strong>{{ LEGAL.entity }}</strong>
      (“{{ BRAND.name }}”, “we”, “us”). By creating an account or using the Service, you agree to these Terms.
      If you do not agree, do not use the Service.
    </p>

    <h2>1. The Service</h2>
    <p>
      {{ BRAND.name }} lets you connect your Instagram account, import your posts as products, customise a
      storefront, and sell to your customers. We provide the software; you are responsible for the store you
      run on it.
    </p>

    <h2>2. Eligibility & accounts</h2>
    <ul>
      <li>You must be at least 18 years old and able to form a binding contract.</li>
      <li>You agree to provide accurate information and to keep your credentials secure.</li>
      <li>You are responsible for all activity under your account.</li>
    </ul>

    <h2>3. Connecting Instagram</h2>
    <p>
      When you connect Instagram, you authorise us to access your own profile and media to operate your
      store. You represent that you own or are licensed to use the content you import, and that your use of
      Instagram through the Service complies with Meta’s and Instagram’s terms and policies. We access this
      data on a read-only basis and never post on your behalf.
    </p>

    <h2>4. Your content</h2>
    <p>
      You retain ownership of the content you import or create (posts, images, product details, branding).
      You grant {{ BRAND.name }} a non-exclusive, worldwide licence to host, store, reproduce, adapt and
      display that content <strong>solely to operate and provide the Service</strong> (for example, to
      generate product drafts, build your storefront, and display your store to shoppers). This licence ends
      when you delete the content or close your account, except for content already shared with third
      parties (e.g. a completed order) or retained as required by law.
    </p>

    <h2>5. Acceptable use</h2>
    <p>You agree not to use the Service to:</p>
    <ul>
      <li>sell unlawful, counterfeit, infringing, or prohibited goods or services;</li>
      <li>infringe anyone’s intellectual property or privacy rights;</li>
      <li>upload malware or attempt to disrupt, reverse-engineer, or gain unauthorised access to the Service;</li>
      <li>misrepresent your identity or your products; or</li>
      <li>violate any applicable law or any third-party platform’s terms (including Meta/Instagram and Stripe).</li>
    </ul>

    <h2>6. Stores, sales & buyers</h2>
    <p>
      You are the <strong>merchant of record</strong> and seller of the products in your store. You are
      solely responsible for your product listings, pricing, descriptions, availability, order fulfilment,
      shipping, customer service, returns, and for collecting and remitting any applicable taxes.
      {{ BRAND.name }} is not a party to the transactions between you and your buyers.
    </p>

    <h2>7. Payments & fees</h2>
    <p>
      Card payments are processed by <strong>Stripe</strong> and settle to your own connected Stripe account,
      subject to Stripe’s terms. {{ BRAND.name }} may deduct a platform commission and/or charge subscription
      fees for use of the Service, as disclosed to you. You are responsible for chargebacks, refunds, and
      disputes relating to your sales.
    </p>

    <h2>8. Intellectual property</h2>
    <p>
      The Service, including its software, design and trademarks, is owned by {{ BRAND.name }} and its
      licensors. These Terms grant you a limited, non-exclusive, non-transferable right to use the Service;
      they do not transfer any ownership in the Service to you.
    </p>

    <h2>9. Third-party services</h2>
    <p>
      The Service integrates third parties such as Instagram/Meta and Stripe. Your use of those integrations
      is also governed by their respective terms, and we are not responsible for their acts or omissions.
    </p>

    <h2>10. Termination</h2>
    <p>
      You may stop using the Service and delete your account at any time. We may suspend or terminate your
      access if you breach these Terms or use the Service in a way that creates risk or legal exposure. On
      termination, your right to use the Service ends; sections that by their nature should survive will
      survive.
    </p>

    <h2>11. Disclaimers</h2>
    <p>
      The Service is provided “as is” and “as available”, without warranties of any kind, whether express or
      implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not
      warrant that the Service will be uninterrupted or error-free.
    </p>

    <h2>12. Limitation of liability</h2>
    <p>
      To the maximum extent permitted by law, {{ BRAND.name }} will not be liable for any indirect,
      incidental, special, consequential or punitive damages, or for lost profits, revenues, data or
      goodwill. Our total liability for any claim relating to the Service will not exceed the amounts you
      paid to us for the Service in the twelve months before the event giving rise to the claim.
    </p>

    <h2>13. Indemnification</h2>
    <p>
      You agree to indemnify and hold {{ BRAND.name }} harmless from claims, losses and expenses arising out
      of your content, your products, your sales, or your breach of these Terms or of any law or third-party
      right.
    </p>

    <h2>14. Changes</h2>
    <p>
      We may update these Terms from time to time. We will update the “Last updated” date and, for material
      changes, provide additional notice. Continued use of the Service after changes take effect constitutes
      acceptance.
    </p>

    <h2>15. Governing law</h2>
    <p>
      These Terms are governed by the laws of <strong>{{ LEGAL.governingLaw }}</strong>, without regard to
      its conflict-of-laws rules, and the courts located there will have jurisdiction over any disputes,
      unless applicable law provides otherwise.
    </p>

    <h2>16. Contact</h2>
    <p>
      {{ LEGAL.entity }}<br>
      {{ LEGAL.address }}<br>
      {{ LEGAL.contactEmail }}
    </p>

    <hr>
    <p class="text-sm">
      This document is a template tailored to {{ BRAND.name }} and provided for convenience. It is not legal
      advice; please have it reviewed by qualified counsel and complete the bracketed details before
      publishing.
    </p>
  </LegalPage>
</template>
