// Single source of truth for the marketing-site content (apex / chanis.app).
// Pages under layers/marketing render from these constants, so copy edits live in
// one place. Auto-imported across the marketing layer (Nuxt app/utils).
import { BRAND } from '~~/shared/brand'

// --- Primary navigation -----------------------------------------------------
// Drives the marketing header + footer. `to` is a same-surface (apex) path.
export interface NavItem { label: string; to: string; icon?: string }

export const MARKETING_NAV: NavItem[] = [
  { label: 'Tour', to: '/tour', icon: 'i-lucide-compass' },
  { label: 'Screenshots', to: '/screenshots', icon: 'i-lucide-image' },
  { label: 'Pricing', to: '/pricing', icon: 'i-lucide-tag' },
  { label: 'Customers', to: '/customers', icon: 'i-lucide-store' },
  { label: 'Manifesto', to: '/manifesto', icon: 'i-lucide-feather' },
  { label: 'Blog', to: '/blog', icon: 'i-lucide-newspaper' },
]

// --- Features (Overview + Tour) ---------------------------------------------
// `summary` is the one-liner used on the home overview; `detail` is the longer
// copy shown on the guided tour.
export interface Feature {
  icon: string
  title: string
  summary: string
  detail: string
}

export const FEATURES: Feature[] = [
  {
    icon: 'i-lucide-download',
    title: 'Import from Instagram',
    summary: 'We pull your posts and turn each one into a ready-to-edit product.',
    detail:
      'Connect your account once and Chanis imports your existing posts — images, captions and all. Each post becomes a draft product with a title and description suggested for you, so a feed you have spent years building becomes a catalogue in minutes instead of a weekend of copy-paste.',
  },
  {
    icon: 'i-lucide-palette',
    title: 'Brand matched automatically',
    summary: 'Colours, fonts and layout are detected from your feed to fit your vibe.',
    detail:
      'Your shop should look like you, not like a template. Chanis reads the mood of your posts — palette, typography, the way you frame a shot — and art-directs a storefront to match. You can fine-tune every token, but most sellers ship the first draft as-is.',
  },
  {
    icon: 'i-lucide-shopping-cart',
    title: 'Sell with real checkout',
    summary: 'Share one link and accept card payments straight to your own account.',
    detail:
      'Payments run on Stripe and settle to your own connected account — Chanis is never in the middle of your money. Carts, order confirmations and a clean checkout come built in, so the moment your store is live you can take a real order.',
  },
  {
    icon: 'i-lucide-wand-sparkles',
    title: 'Smart product drafts',
    summary: 'AI writes first-pass titles, descriptions and categories from each caption.',
    detail:
      'Captions are great for the gram and terrible as product copy. Chanis rewrites them into clear titles and descriptions, sorts items into categories, and flags non-product posts (the flat-lays and behind-the-scenes shots) so they brand your store instead of cluttering your catalogue.',
  },
  {
    icon: 'i-lucide-smartphone',
    title: 'Built for the phone',
    summary: 'Every storefront is fast and flawless on the device your buyers actually use.',
    detail:
      'Your customers arrive from a story or a bio link on a phone, on cellular, with a thumb. Storefronts are server-rendered and tuned to load instantly and read beautifully on small screens — because a checkout that stutters is a sale that does not happen.',
  },
  {
    icon: 'i-lucide-line-chart',
    title: 'Orders in one place',
    summary: 'Track sales, fulfilment and customers from a single dashboard.',
    detail:
      'Every order lands in one tidy dashboard with the buyer’s details, what they bought and where it is in fulfilment. No spreadsheets, no scrolling DMs to remember who asked for the sage-green one in a medium.',
  },
]

// --- Screen captures & videos -----------------------------------------------
// We render device/browser-framed placeholders (no stock screenshots) — each
// entry describes a real surface of the product.
export interface Shot {
  kind: 'desktop' | 'mobile' | 'video'
  title: string
  caption: string
}

export const GALLERY: Shot[] = [
  { kind: 'desktop', title: 'The seller dashboard', caption: 'Your stores, orders and revenue at a glance the moment you sign in.' },
  { kind: 'mobile', title: 'A live storefront', caption: 'How your shop looks to a buyer arriving from your bio link.' },
  { kind: 'video', title: 'Import in under two minutes', caption: 'Connect Instagram, pick the posts to sell, publish. Start to finish.' },
  { kind: 'desktop', title: 'The product editor', caption: 'Tweak titles, prices and photos with a live preview beside you.' },
  { kind: 'desktop', title: 'The theme editor', caption: 'Nudge colours, fonts and spacing — or accept the brand we matched for you.' },
  { kind: 'video', title: 'A buyer checks out', caption: 'Cart to Stripe payment to order confirmation, on a phone, in one flow.' },
]

// --- Manifesto --------------------------------------------------------------
export interface Principle { title: string; body: string }

export const MANIFESTO = {
  lede: 'We think selling what you make should feel as natural as posting it. Here is what we believe — and what we refuse to build.',
  principles: <Principle[]>[
    {
      title: 'Your audience is already here',
      body: 'You did the hard part. You built a following, post after post, by showing up. The last thing you need is to start over on a platform nobody knows you on. Chanis meets your business where it already lives — on Instagram — and turns the feed you have into the shop you want.',
    },
    {
      title: 'A shop should look like its maker',
      body: 'Most store builders hand you a grid of identical templates and call it choice. We think the opposite. Your storefront should carry your colours, your type, your feel — pulled from the work you already make — so a buyer never feels the seam between your post and your product page.',
    },
    {
      title: 'Software should do the boring parts',
      body: 'Writing the same description twenty ways, resizing images, sorting items into categories — this is work a computer should do so you can do the work only you can. We point our AI at the tedium, never at replacing your taste.',
    },
    {
      title: 'Your money is yours',
      body: 'Payments settle straight to your own Stripe account. We are not a marketplace that holds your funds, ranks you against your peers, or owns your customer list. You are the merchant of record. We are just the software.',
    },
    {
      title: 'Fast is a feature',
      body: 'Your buyer is on a phone, on cellular, halfway out the door. Every hundred milliseconds is a sale on the line. We obsess over speed so you never lose an order to a spinner.',
    },
    {
      title: 'Earn the next month',
      body: 'No lock-in, no contracts, no holding your store hostage. You can export and leave whenever you like. We would rather earn your subscription every month than trap you into it.',
    },
  ],
}

// --- Case studies -----------------------------------------------------------
export interface Metric { label: string; value: string }
export interface CaseStudy {
  slug: string
  store: string
  handle: string
  industry: string
  summary: string
  quote: string
  metrics: Metric[]
  body: string // trusted HTML, rendered into marketing prose
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'oat-and-ochre',
    store: 'Oat & Ochre',
    handle: '@oatandochre',
    industry: 'Handmade ceramics',
    summary: 'A one-person pottery studio replaced a DM-and-bank-transfer workflow with a real checkout in an afternoon.',
    quote: 'I imported three years of posts before my coffee went cold. The shop already looked like my shop.',
    metrics: [
      { label: 'Setup time', value: '1 afternoon' },
      { label: 'Posts imported', value: '180+' },
      { label: 'First sale', value: 'Same day' },
    ],
    body: `
      <p>Mara had spent three years building a following for her stoneware on Instagram, selling the only way she could: a comment, a DM, a bank transfer, a hope that the buyer would actually pay. Half the work was admin. The other half was apologising for it.</p>
      <h2>From feed to shop in an afternoon</h2>
      <p>She connected her account and Chanis imported her back catalogue — every mug, every glaze test, every sold-out batch — as draft products with titles and descriptions already written from her captions. The branding came back in her own muted palette without her touching a colour picker.</p>
      <p>She spent the afternoon setting prices and hiding the behind-the-scenes posts, then published. A regular who had been "in line" for a planter for months checked out that evening — with a card, no DM required.</p>
      <h2>What changed</h2>
      <p>The bank-transfer chase is gone. Orders arrive in one dashboard with the buyer's address attached. Mara is back to making pots instead of managing a spreadsheet of who owes her what.</p>
    `,
  },
  {
    slug: 'field-notes-flowers',
    store: 'Field Notes Flowers',
    handle: '@fieldnotesflowers',
    industry: 'Florist & dried bouquets',
    summary: 'A weekend market florist opened a storefront for drops and now sells out batches before the stall is even set up.',
    quote: 'I used to lose half my Saturday to “is this still available?” Now the answer is just the website.',
    metrics: [
      { label: 'DM volume', value: '−70%' },
      { label: 'Drop sell-through', value: 'Hours, not days' },
      { label: 'Repeat buyers', value: '2× quarter on quarter' },
    ],
    body: `
      <p>Priya sells dried bouquets at a weekend market and announces small drops on Instagram. Each drop used to bury her in identical DMs — availability, price, pickup — answered one thumb-typed message at a time.</p>
      <h2>A link instead of a hundred replies</h2>
      <p>Now a drop is a storefront link in her story. Stock counts down on its own, sold-out items mark themselves, and buyers pay on the spot. The DMs that used to eat her Saturday simply stopped arriving.</p>
      <h2>The unexpected win</h2>
      <p>With a real product page to return to, customers started coming back between drops. Repeat orders doubled quarter on quarter — not because she posted more, but because buying was finally easy.</p>
    `,
  },
  {
    slug: 'relay-threadwear',
    store: 'Relay Threadwear',
    handle: '@relaythreadwear',
    industry: 'Small-batch apparel',
    summary: 'A two-person clothing label moved off a clunky template store and cut its checkout drop-off in half.',
    quote: 'Our old store felt like someone else’s. This one feels like the brand we actually built.',
    metrics: [
      { label: 'Checkout drop-off', value: '−48%' },
      { label: 'Mobile sales share', value: '83%' },
      { label: 'Time to restock a drop', value: 'Minutes' },
    ],
    body: `
      <p>Relay had outgrown its first store builder — a generic template that loaded slowly and looked nothing like the label's bold, high-contrast feed. On mobile, where most of their buyers were, the checkout simply lost people.</p>
      <h2>A storefront that matched the brand</h2>
      <p>Chanis rebuilt the look from their own posts: the type, the colours, the rhythm. Pages that used to crawl now load instantly. The team imports a new drop straight from the posts announcing it, so the shop is restocked in the time it takes to publish a caption.</p>
      <h2>The result</h2>
      <p>Checkout drop-off fell by nearly half, and the share of sales completing on mobile climbed to 83%. Same product, same audience — a store that finally got out of the way.</p>
    `,
  },
]

// --- Buzz (testimonials) ----------------------------------------------------
export interface Testimonial { quote: string; name: string; handle: string; role: string }

export const TESTIMONIALS: Testimonial[] = [
  { quote: 'It read my feed and built a shop that actually looks like me. I changed almost nothing.', name: 'Mara L.', handle: '@oatandochre', role: 'Ceramicist' },
  { quote: 'From “follow for the drop” to a real checkout link in one afternoon. My DMs have never been quieter.', name: 'Priya N.', handle: '@fieldnotesflowers', role: 'Florist' },
  { quote: 'The fastest storefront we have ever run, and the only one that matched our brand out of the box.', name: 'Theo & Sam', handle: '@relaythreadwear', role: 'Apparel label' },
  { quote: 'I sell prints between exhibitions. Chanis turned my archive of posts into a catalogue overnight.', name: 'Devon R.', handle: '@devonmakesmarks', role: 'Illustrator' },
  { quote: 'Money lands in my own Stripe account. No marketplace taking a cut of every order or owning my customers.', name: 'Aisha K.', handle: '@saffronandsalt', role: 'Spice merchant' },
  { quote: 'My customers buy from their phones in ten seconds. That was never true on my old site.', name: 'Luca M.', handle: '@lucaleatherco', role: 'Leather goods' },
]

// Short press-style pull-quotes for the home "buzz" band.
export const PRESS: { quote: string; source: string }[] = [
  { quote: 'The shortest path from an Instagram feed to a checkout we have seen.', source: 'Indie Makers Weekly' },
  { quote: 'Finally, a store builder that lets the seller’s own taste lead.', source: 'The Small Shop Report' },
  { quote: 'It treats your back catalogue of posts as the asset it always was.', source: 'Creator Economy Digest' },
]

// --- Pricing ----------------------------------------------------------------
export interface PricingTier {
  name: string
  priceMonthly: number | null // null = custom / contact
  blurb: string
  features: string[]
  cta: string
  featured?: boolean
  note?: string
}

export const PRICING_CURRENCY = '$'

export const PRICING: PricingTier[] = [
  {
    name: 'Starter',
    priceMonthly: 0,
    blurb: 'Everything you need to open a shop and take your first orders.',
    features: [
      'Import from Instagram',
      'One storefront on a chanis.app subdomain',
      'Up to 25 products',
      'Stripe checkout to your own account',
      'Auto-matched branding',
    ],
    cta: 'Start free',
    note: 'No card required',
  },
  {
    name: 'Pro',
    priceMonthly: 19,
    blurb: 'For shops that are growing and want the rough edges gone.',
    features: [
      'Everything in Starter',
      'Unlimited products',
      'Connect a custom domain',
      'AI product drafts & categorisation',
      'Remove Chanis footer badge',
      'Priority email support',
    ],
    cta: 'Start free trial',
    featured: true,
    note: '14-day free trial',
  },
  {
    name: 'Studio',
    priceMonthly: null,
    blurb: 'For multi-brand makers and small teams running several stores.',
    features: [
      'Everything in Pro',
      'Multiple storefronts',
      'Team seats & roles',
      'Lower platform commission',
      'Onboarding help & a dedicated contact',
    ],
    cta: 'Talk to us',
  },
]

export const PRICING_FAQ: { q: string; a: string }[] = [
  { q: 'Do you take a cut of my sales?', a: 'Payments settle straight to your own Stripe account — we never hold your money. A small platform commission applies on paid plans and is lower on Studio; your subscription covers the rest.' },
  { q: 'Can I use my own domain?', a: 'Yes. Every shop gets a free yourname.chanis.app address, and Pro and Studio let you connect a custom domain you own.' },
  { q: 'What happens to my data if I leave?', a: 'It is yours. You can export your products and customers and disconnect Instagram at any time — no lock-in, no contracts.' },
  { q: 'Is there really a free plan?', a: 'Yes. Starter is free forever for a single small shop, with no card required. Upgrade only when you outgrow it.' },
]

// --- Weblog -----------------------------------------------------------------
export interface BlogPost {
  slug: string
  title: string
  date: string // ISO; displayed via toLocaleDateString
  author: string
  tag: string
  excerpt: string
  body: string // trusted HTML, rendered into marketing prose
}

export const POSTS: BlogPost[] = [
  {
    slug: 'turn-your-feed-into-a-shop',
    title: 'Your feed is already a catalogue. Treat it like one.',
    date: '2026-06-18',
    author: `The ${BRAND.name} team`,
    tag: 'Playbook',
    excerpt: 'Years of posts are the hardest part of building a shop — and you have already done it. Here is how to turn that archive into products without starting over.',
    body: `
      <p>Every seller we meet has the same quiet superpower and does not know it: a feed full of products, photographed beautifully, captioned in their own voice, ordered by the people who already want them. It is a catalogue. It has just never been treated like one.</p>
      <h2>Start with what sold</h2>
      <p>Before you import everything, scroll your own feed and notice which posts people asked to buy. Those comments and DMs are free demand research. Lead your shop with the things that already moved.</p>
      <h2>Let the captions do the first draft</h2>
      <p>Your captions were written for the algorithm, not for a product page — but they are a great starting point. Chanis rewrites them into clear titles and descriptions so you are editing, not staring at a blank field.</p>
      <h2>Hide the brand posts, keep the brand</h2>
      <p>Not every post is a product. The flat-lays, the studio shots, the behind-the-scenes — those are not items to sell, they are the mood of your shop. Keep them as branding and let them set the tone while your products do the selling.</p>
      <p>The point is not to rebuild your business somewhere new. It is to point a checkout at the one you already have.</p>
    `,
  },
  {
    slug: 'pricing-without-second-guessing',
    title: 'How to price what you make without second-guessing yourself',
    date: '2026-06-04',
    author: `The ${BRAND.name} team`,
    tag: 'Guide',
    excerpt: 'Pricing is the question every maker dreads. A simple framework to land on a number you can defend — and stop discounting out of nerves.',
    body: `
      <p>If pricing makes your stomach drop, you are in good company. Almost every maker undercharges at first, usually out of a fear that the "real" number will scare people off. It rarely does. Here is a way to think about it without spiralling.</p>
      <h2>Cover your costs, then your time</h2>
      <p>Add up materials, fees and the slice of your overheads each item carries. That is your floor — selling below it is paying for the privilege of working. Then price your time honestly, because "handmade" is a polite word for "hours."</p>
      <h2>Anchor with a range</h2>
      <p>A shop with one price point feels flat. Offer a clear good-better-best and most people reach for the middle. The cheapest option makes the middle feel sensible; the dearest makes it feel like a deal.</p>
      <h2>Stop apologising in the caption</h2>
      <p>"Sorry it's a bit pricey" is a discount you are giving away for free. State the price plainly. The buyers who value the work will pay it, and the ones who were never going to buy were never your customer.</p>
    `,
  },
  {
    slug: 'speed-is-a-feature',
    title: 'Why we are obsessed with how fast your storefront loads',
    date: '2026-05-20',
    author: `The ${BRAND.name} team`,
    tag: 'Behind the build',
    excerpt: 'Your buyer is on a phone, on cellular, halfway out the door. A few hundred milliseconds is the difference between a sale and a bounce. Here is how we chase them.',
    body: `
      <p>The most expensive thing a storefront can do is make someone wait. Your buyer arrived from a story, on a phone, on a patchy connection, with about as much patience as a closing lift door. Speed is not a nice-to-have for them. It is whether the sale happens at all.</p>
      <h2>Render on the server</h2>
      <p>Every storefront is rendered on the server and sent as ready-to-read HTML, so the first thing your buyer sees is your products — not a spinner waiting for a script to wake up.</p>
      <h2>Ship less to the phone</h2>
      <p>We are ruthless about how much code and how many images reach the device. Pictures are sized for the screen that asked for them; nothing loads that the page does not need yet.</p>
      <h2>Measure the worst case, not the average</h2>
      <p>Averages lie. We tune for the slow phone on the bad connection, because that buyer is real and they are trying to give you money. Make it fast for them and it is instant for everyone else.</p>
    `,
  },
]
