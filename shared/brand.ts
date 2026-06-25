// Single source of truth for the product brand. Rename here to rebrand everywhere
// (logo wordmark, page chrome, SEO, transactional email).
export const BRAND = {
  name: 'Chanis',
  tagline: 'Turn your Instagram into a shop.',
  // Long-form description used for SEO / social cards.
  description:
    'Chanis turns your Instagram into a fully hosted online store. Connect your account, auto-import your posts as products, match your brand, and start selling — no code, ready in minutes.',
} as const

// Placeholders for the legal/compliance pages. FILL THESE IN before publishing, and
// have the Privacy Policy + Terms reviewed by a lawyer. They are surfaced verbatim on
// /privacy, /terms and /data-deletion.
export const LEGAL = {
  entity: '[Legal entity name]',
  contactEmail: '[privacy@your-domain.com]',
  address: '[Registered business address]',
  governingLaw: '[Country / State of governing law]',
  effectiveDate: '[Effective date]',
} as const
