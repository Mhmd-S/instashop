export interface BrandingAsset {
  id: string
  public_url: string | null
  role: string
  caption: string | null
  used_as: string | null
  ig_permalink: string | null
  // Where the asset came from: 'ig' (an imported post), 'product' (an auto-selected
  // product photo backing the hero), or 'upload'. Optional on older payloads.
  source?: string
  // The AI hero-suitability score (0–100) and one-line rationale, when this asset was
  // chosen automatically. Null/absent for manually-picked or unscored assets.
  hero_score?: number | null
  hero_reason?: string | null
}
