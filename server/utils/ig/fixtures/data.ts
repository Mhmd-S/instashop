// AUTO-GENERATED fixture data (authored by the refine-ig-generation workflow).
// Realistic mock Instagram shops for the DEV-ONLY fixture importer. Captions are
// deliberately messy (emoji/hashtags/CTAs/prices) to exercise the description
// cleaner; expectations encode the intended merge/split/branding ground truth.

export interface FixturePost {
  localId: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  caption: string
  imageDescriptions: string[]
}
export interface FixtureExpectationProduct {
  title?: string
  memberLocalIds: string[]
  categories?: string[]
  needsReview?: boolean
}
export interface FixtureShop {
  shop: { name: string; niche: string; baseCurrency: string; profilePictureDescription?: string }
  posts: FixturePost[]
  expectations: { products: FixtureExpectationProduct[]; brandingLocalIds: string[] }
}

export const FIXTURES: Record<string, FixtureShop> = {
  "apparel": {
    "shop": {
      "name": "Maïa Linen Studio",
      "niche": "women's slow-fashion / linen clothing boutique",
      "baseCurrency": "USD",
      "profilePictureDescription": "minimal sand-beige logo mark, lowercase serif 'maïa' on a warm oatmeal linen-texture background"
    },
    "posts": [
      {
        "localId": "p1",
        "mediaType": "IMAGE",
        "caption": "✨ RESTOCK ALERT ✨ our best-selling Aria linen midi dress is BACK in Oatmeal 🤍 sold out twice, don't sleep on it this time loves\n\nbreathable 100% European flax linen, side pockets (yes!!), adjustable tie waist 🌾\n$78 | sizes XS–XL\n\nDM to order ✨ or link in bio 🔗\n.\n.\n#linendress #slowfashion #linenlove #capsulewardrobe #sustainablefashion #ootd #mididress #handmadewithlove",
        "imageDescriptions": [
          "oatmeal beige linen midi dress with tie waist on a wooden hanger against a plain white-washed wall, soft natural light"
        ]
      },
      {
        "localId": "p2",
        "mediaType": "IMAGE",
        "caption": "the Aria midi in Oatmeal again because i'm obsessed 😍 styled here with our tan leather belt + raffia tote for a slow summer morning\n\nthis is THE dress of the season babes. 100% flax linen, side pockets, tie waist. $78, sizes XS to XL\n\nlink in bio to shop 🔗 #linendress #aria #ootd #neutralstyle #slowfashion #linenlover",
        "imageDescriptions": [
          "model in oatmeal beige linen tie-waist midi dress standing in front of a sunlit window, holding a raffia tote, wearing a tan belt"
        ]
      },
      {
        "localId": "p3",
        "mediaType": "CAROUSEL_ALBUM",
        "caption": "The Lina set is here 🌿 cropped button blouse + wide-leg trousers in our new Sage colourway. Mix, match, live in it.\n\nSet 1200 USD ... kidding 😅 → 92 USD for the full set, or buy separately (blouse 44 / trousers 56)\nsizes S M L\n\ncomment SAGE or DM to order 💌 #linenset #coordinatedset #twopiece #sagegreen #slowfashionbrand @threadandtonic",
        "imageDescriptions": [
          "sage green linen cropped button-up blouse and matching wide-leg linen trousers laid flat on a cream backdrop",
          "model wearing sage green linen blouse and wide-leg trousers walking outdoors at golden hour",
          "close-up detail of coconut buttons and linen weave texture on a sage green blouse",
          "back view of sage green linen wide-leg trousers showing the elastic waist gather"
        ]
      },
      {
        "localId": "p4",
        "mediaType": "VIDEO",
        "caption": "POV: your Maïa parcel just arrived 🤎 unboxing the Aria dress in Terracotta — sound on for the linen rustle asmr lol\n\nreel ✨ tap link in bio to shop 🔗\n#unboxing #linendress #reels #smallbusinesscheck #packagingasmr #terracotta #slowfashion",
        "imageDescriptions": [
          "hands unwrapping tissue paper from a kraft gift box revealing a folded terracotta rust-colored linen dress, overhead flatlay video still"
        ]
      },
      {
        "localId": "p5",
        "mediaType": "IMAGE",
        "caption": "Aria midi — now in Terracotta 🧡 same dreamy 100% linen, same pockets, NEW warm rust shade for autumn\n\nRs 1200 / approx $78 — sizes XS–XL\nDM to order ✨ or shop via link in bio\n\n#terracotta #linendress #autumnstyle #slowfashion #earthtones #capsulewardrobe",
        "imageDescriptions": [
          "terracotta rust-colored linen tie-waist midi dress on a hanger against a warm beige wall, natural light"
        ]
      },
      {
        "localId": "p6",
        "mediaType": "IMAGE",
        "caption": "soft mornings + cold brew ☕️🤍 the kind of slow living we make our linen for. happy weekend from the studio 🌾\n\n#slowliving #linenlife #studiomornings #aesthetic #neutralvibes #weekendmood",
        "imageDescriptions": [
          "aesthetic flatlay of a ceramic mug of cold brew on a linen tablecloth beside dried pampas grass and an open book, soft morning light"
        ]
      },
      {
        "localId": "p7",
        "mediaType": "IMAGE",
        "caption": "Juniper linen tote in Natural 🧺 roomy enough for the market, the beach, your whole life. raw-edge handles + inside pocket.\n\n$36 USD ✨ DM to order or link in bio 🔗\none size\n#linentote #totebag #marketbag #sustainablebag #slowfashion #accessories #handmade",
        "imageDescriptions": [
          "natural undyed linen tote bag with raw-edge handles hanging on a hook, plain neutral background"
        ]
      },
      {
        "localId": "p8",
        "mediaType": "CAROUSEL_ALBUM",
        "caption": "behind the seams 🪡 a peek at how every Maïa piece is cut + sewn by our tiny team of 3. slow on purpose. thank you for supporting small 🤍\n\n#behindthescenes #madebyhand #atelier #slowfashionmovement #smallbusiness #sewing #ethicalfashion",
        "imageDescriptions": [
          "seamstress hands guiding beige linen fabric under a vintage sewing machine in a sunlit atelier",
          "rolls of natural and sage linen fabric stacked on wooden shelves",
          "a paper sewing pattern and fabric scissors on a cutting table dusted with chalk lines"
        ]
      },
      {
        "localId": "p9",
        "mediaType": "IMAGE",
        "caption": "the Soleil wrap skirt ☀️ adjustable wrap fits sizes XS through L, falls just below the knee. linen-cotton blend so it's extra drapey.\n\n45 USD 🌼 comment your fave colour below ⬇️ (Natural / Black)\nlink in bio to shop\n#wrapskirt #linenskirt #slowfashion #midiskirt #neutralstyle #summerstyle",
        "imageDescriptions": [
          "natural beige linen wrap skirt tied at the waist on a model, cropped from waist to knee, plain studio background"
        ]
      },
      {
        "localId": "p10",
        "mediaType": "IMAGE",
        "caption": "Soleil wrap skirt in Black 🖤 same easy adjustable wrap, now in our deepest washed black. perfect with everything.\n\n$45 — sizes XS–L\nDM to order ✨\n#wrapskirt #blacklinen #linenskirt #minimalstyle #slowfashion #ootd",
        "imageDescriptions": [
          "washed black linen wrap skirt tied at the waist on a model, cropped waist to knee, plain studio background"
        ]
      },
      {
        "localId": "p11",
        "mediaType": "IMAGE",
        "caption": "🚨 SUMMER SAMPLE SALE this Saturday 11am–4pm 🚨 in-studio only! one-off samples, end-of-line linen + sweet lil discounts 🤍 bring a friend, we'll have iced tea 🧊\n\n📍 14 Rue des Lilas — see you there!\n#samplesale #studiosale #slowfashion #shopsmall #linensale #popup",
        "imageDescriptions": [
          "handwritten chalkboard sign reading SAMPLE SALE SATURDAY propped against a rack of linen garments in a boutique studio"
        ]
      },
      {
        "localId": "p12",
        "mediaType": "IMAGE",
        "caption": "new lil thing 👀 our linen scrunchie trio — made from offcuts so basically zero waste ♻️ comes as a set of 3 (Oatmeal/Sage/Terracotta)\n\nsmall but mighty ✨ link in bio 🔗\n#scrunchie #zerowaste #hairaccessories #linen #slowfashion #offcuts #sustainable",
        "imageDescriptions": [
          "three linen scrunchies in oatmeal, sage, and terracotta arranged in a small pile on a white surface, close-up"
        ]
      },
      {
        "localId": "p13",
        "mediaType": "IMAGE",
        "caption": "a moment for this colour 🌅 swipe-worthy sunset tones on the studio wall today. what should we name this shade?? drop ideas below 👇\n\n#colourinspo #studiolife #moodboard #terracotta #earthtones #aesthetic #slowliving",
        "imageDescriptions": [
          "abstract close-up of a terracotta-painted plaster wall washed in warm sunset light, no products visible"
        ]
      }
    ],
    "expectations": {
      "products": [
        {
          "title": "Aria Linen Midi Dress — Oatmeal",
          "memberLocalIds": [
            "p1",
            "p2"
          ],
          "categories": [
            "dresses",
            "linen"
          ],
          "needsReview": false
        },
        {
          "title": "Aria Linen Midi Dress — Terracotta",
          "memberLocalIds": [
            "p5"
          ],
          "categories": [
            "dresses",
            "linen"
          ],
          "needsReview": false
        },
        {
          "title": "Lina Linen Set — Sage (Blouse + Trousers)",
          "memberLocalIds": [
            "p3"
          ],
          "categories": [
            "sets",
            "tops",
            "bottoms"
          ],
          "needsReview": false
        },
        {
          "title": "Juniper Linen Tote — Natural",
          "memberLocalIds": [
            "p7"
          ],
          "categories": [
            "accessories",
            "bags"
          ],
          "needsReview": false
        },
        {
          "title": "Soleil Wrap Skirt — Natural",
          "memberLocalIds": [
            "p9"
          ],
          "categories": [
            "skirts",
            "bottoms"
          ],
          "needsReview": false
        },
        {
          "title": "Soleil Wrap Skirt — Black",
          "memberLocalIds": [
            "p10"
          ],
          "categories": [
            "skirts",
            "bottoms"
          ],
          "needsReview": false
        },
        {
          "title": "Linen Scrunchie Trio",
          "memberLocalIds": [
            "p12"
          ],
          "categories": [
            "accessories",
            "hair accessories"
          ],
          "needsReview": true
        },
        {
          "title": "Aria Dress Unboxing — Terracotta",
          "memberLocalIds": [
            "p4"
          ],
          "categories": [
            "dresses",
            "linen"
          ],
          "needsReview": true
        }
      ],
      "brandingLocalIds": [
        "p6",
        "p8",
        "p11",
        "p13"
      ]
    }
  },
  "jewelry": {
    "shop": {
      "name": "Marigold & Moss",
      "niche": "handmade jewelry & accessories",
      "baseCurrency": "USD",
      "profilePictureDescription": "minimalist line-drawing logo of a marigold flower in burnt-orange ink on a cream background, hand-lettered studio name beneath"
    },
    "posts": [
      {
        "localId": "p1",
        "mediaType": "IMAGE",
        "caption": "✨ NEW DROP ✨ The Solstice hoops are finally here 🌞 hand-forged brass, hammered finish, super lightweight so you can wear them allll day. $42 each 👇 DM to order or tap the link in bio 🛍️\n.\n.\n#handmadejewelry #brassjewelry #hoopearrings #smallbusiness #makersgonnamake #shophandmade #slowfashion #handforged",
        "imageDescriptions": [
          "pair of hammered brass hoop earrings on a textured cream linen background, soft natural light"
        ]
      },
      {
        "localId": "p2",
        "mediaType": "VIDEO",
        "caption": "behind the scenes at the bench this week 🔨🔥 there's something so meditative about hammering metal at 7am with coffee ☕️ sound on for the satisfying clink clink clink 🎧 what should I make next?? drop ideas below 👇\n.\n#studiolife #behindthescenes #jewelrymaking #makersofinstagram #processvideo #metalsmith #handmadeprocess",
        "imageDescriptions": [
          "overhead reel of hands hammering a brass blank on a steel bench block in a sunlit jewelry studio, tools scattered around"
        ]
      },
      {
        "localId": "p3",
        "mediaType": "CAROUSEL_ALBUM",
        "caption": "Meet 'Tidewater' 🌊 a one-of-a-kind statement necklace — raw labradorite teardrop wrapped in oxidized sterling silver on a 18\" chain. The flash on this stone is UNREAL, swipe to see it catch the light 💙 truly 1/1, when it's gone it's gone. 145 USD ✨ DM to claim 💌\n.\n.\n#oneofakind #labradorite #statementnecklace #sterlingsilver #crystaljewelry #wirewrapped #ooak #handmadenecklace #giftsforher",
        "imageDescriptions": [
          "front view of a labradorite teardrop pendant necklace in oxidized silver on a white marble surface",
          "close-up macro of the labradorite stone showing blue and green flash under light",
          "side angle of the same pendant showing the wire-wrapped silver bezel",
          "the necklace draped on a model's collarbone against a neutral knit top"
        ]
      },
      {
        "localId": "p4",
        "mediaType": "IMAGE",
        "caption": "SOLD 💔 thank you so much @lena.makes for giving 'Tidewater' a home!! 🌊 this labradorite beauty is off to its new owner 📦 don't worry — more one-of-a-kind pieces coming this weekend 🙌 follow along so you don't miss the next drop ✨\n.\n#sold #thankyou #smallbusinesslove #oneofakind #labradorite #happycustomer",
        "imageDescriptions": [
          "the Tidewater labradorite necklace nestled in a small kraft gift box with tissue paper and a thank-you card, ready to ship"
        ]
      },
      {
        "localId": "p5",
        "mediaType": "IMAGE",
        "caption": "stacking season is upon us 🍂 these dainty beaded rings are back in stock! freshwater pearl + gold-filled, sized to order. Rs 1200 each or 3 for Rs 3000 🤎 perfect lil treat for yourself or a gift 🎁 link in bio to shop, worldwide shipping 🌍\n.\n#stackingrings #beadedrings #pearljewelry #goldfilled #daintyrings #handmaderings #ringstack #shopsmall #jewelrygram",
        "imageDescriptions": [
          "three thin gold-filled beaded rings with tiny freshwater pearls stacked on a single finger, soft focus background"
        ]
      },
      {
        "localId": "p6",
        "mediaType": "IMAGE",
        "caption": "the 'Ember' anklet ✨🔥 tiny carnelian chips on a delicate gold chain — summer's whole vibe in one piece 🧡 adjustable 9-10\". $28 💛 comment SHIP or DM to grab one!\n.\n.\n#anklet #carnelian #summerjewelry #beachjewelry #daintyjewelry #handmadeanklet #goldjewelry #bohojewelry",
        "imageDescriptions": [
          "a delicate gold anklet with small orange carnelian chip beads photographed on a tanned ankle at the beach, sand background"
        ]
      },
      {
        "localId": "p7",
        "mediaType": "CAROUSEL_ALBUM",
        "caption": "restocked!! 🙌 the bestselling 'Olive' studs are back 🫒 tiny green enamel + 14k gold-filled posts, hypoallergenic & so so light. swipe for a wrist+ear shot 👂 $34 a pair. link in bio 🛒 ps these sold out in 2 days last time so don't sleep 😴\n.\n#studearrings #enameljewelry #goldfilled #hypoallergenic #everydayjewelry #minimalistjewelry #restock #handmadestuds",
        "imageDescriptions": [
          "pair of small olive-green enamel stud earrings on a white background",
          "model wearing the olive enamel studs, close-up of ear and jawline in natural light"
        ]
      },
      {
        "localId": "p8",
        "mediaType": "IMAGE",
        "caption": "coffee, clay, chaos ☕️🎨 my studio corner on a Monday morning ✨ grateful for this little creative life 🥹 happy week everyone! what are you making today?\n.\n#studiolife #creativelife #makerlife #mondaymood #studiocorner #handmadebusiness #womeninbusiness",
        "imageDescriptions": [
          "cozy jewelry studio corner with a mug of coffee, scattered polymer clay, pliers and half-finished pieces on a wooden desk by a window"
        ]
      },
      {
        "localId": "p9",
        "mediaType": "IMAGE",
        "caption": "'Olive' studs — but make it BLUE 💙 same beloved design, brand new dusty-blue enamel colorway 🫐 14k gold-filled posts, hypoallergenic. $34/pair ✨ which color team are you?? 🟢 vs 🔵 comment below! DM to order 💌\n.\n#studearrings #enameljewelry #goldfilled #newcolor #minimalistjewelry #everydayearrings #handmadestuds #bluejewelry",
        "imageDescriptions": [
          "pair of small dusty-blue enamel stud earrings on a white background, matching the olive studs design"
        ]
      },
      {
        "localId": "p10",
        "mediaType": "IMAGE",
        "caption": "one-of-a-kind alert 🚨 'Wildflower' — pressed real flowers set in resin on a gold bar pendant 🌼 no two are ever the same, this exact one is the only one 💛 16\" chain. 58 USD ✨ DM to make it yours before someone else does 👀\n.\n.\n#resinjewelry #pressedflowers #oneofakind #flowerjewelry #botanicaljewelry #ooak #handmadependant #naturejewelry #giftsforher",
        "imageDescriptions": [
          "a rectangular gold bar pendant containing pressed yellow and white wildflowers set in clear resin, on a light wood surface"
        ]
      },
      {
        "localId": "p11",
        "mediaType": "IMAGE",
        "caption": "🎉 GIVEAWAY CLOSED 🎉 congrats to @maya.rosewood for winning the mystery jewelry bundle!! 🥳 check your DMs 💌 thank you to everyone who entered & shared — you're the best community a maker could ask for 🥹💛 more goodies coming soon, stay tuned!\n.\n#giveawaywinner #giveaway #smallbusinesslove #thankyou #communitylove #handmadejewelry",
        "imageDescriptions": [
          "flat-lay of an assortment of handmade earrings, rings and a necklace bundled together with ribbon on a pastel background"
        ]
      },
      {
        "localId": "p12",
        "mediaType": "IMAGE",
        "caption": "wrapped & ready 📦✨ every order ships in recycled kraft packaging with a handwritten note 💌 because the little details matter 🤎 thank you for supporting handmade & slow-made 🌿\n.\n#packaging #ecofriendly #smallbusinesspackaging #handmadewithlove #slowmade #sustainablebusiness #orderpackaging",
        "imageDescriptions": [
          "several small kraft jewelry boxes tied with twine and handwritten notes, arranged on a linen surface ready for shipping"
        ]
      },
      {
        "localId": "p13",
        "mediaType": "IMAGE",
        "caption": "✨ The Solstice hoops in action 😍 photo by the lovely @portrait.by.ria 📸 these hammered brass beauties go with literally everything. only a few pairs left from this batch! $42 — link in bio or DM ✨ (yes they're the same hoops from my last post, just had to show you how they look on!! 🥰)\n.\n#brasshoops #hammeredhoops #handmadeearrings #hoopearrings #brassjewelry #everydayjewelry #handforged #ootd",
        "imageDescriptions": [
          "a model wearing the hammered brass hoop earrings, three-quarter profile portrait with soft window light, hair tucked behind ear"
        ]
      },
      {
        "localId": "p14",
        "mediaType": "IMAGE",
        "caption": "tried something a little different this week 🤔 raw amethyst points on leather cord — wrap bracelet OR choker, you decide how to style it 🔮 honestly not sure how I feel about the leather, let me know your thoughts?? 35 USD if anyone wants it, otherwise it might just live in my studio 😅\n.\n#amethyst #leatherjewelry #wrapbracelet #experimental #crystaljewelry #rawcrystal #handmade #onepiece",
        "imageDescriptions": [
          "a raw amethyst crystal point wrapped onto a brown leather cord, coiled on a dark slate surface"
        ]
      },
      {
        "localId": "p15",
        "mediaType": "CAROUSEL_ALBUM",
        "caption": "Holiday Market this Saturday!! 🎄✨ come find me at the Riverside Makers Market, booth 14, 10am-4pm 📍 I'll have the full collection PLUS some market-only one-of-a-kinds 👀 bring a friend! swipe for last year's setup 🥰 can't wait to see you there 💛\n.\n#makersmarket #holidaymarket #shoplocal #craftfair #smallbusiness #handmadejewelry #riverside #popupshop",
        "imageDescriptions": [
          "a poster graphic announcing Riverside Makers Market with date, time and booth number over a festive illustrated background",
          "photo of a handmade jewelry market booth display from last year with earrings on stands and necklaces hung on a board"
        ]
      }
    ],
    "expectations": {
      "products": [
        {
          "title": "Solstice Hammered Brass Hoops",
          "memberLocalIds": [
            "p1",
            "p13"
          ],
          "categories": [
            "earrings",
            "brass jewelry"
          ],
          "needsReview": false
        },
        {
          "title": "Tidewater Labradorite Necklace",
          "memberLocalIds": [
            "p3"
          ],
          "categories": [
            "necklaces",
            "one-of-a-kind"
          ],
          "needsReview": false
        },
        {
          "title": "Pearl Beaded Stacking Rings",
          "memberLocalIds": [
            "p5"
          ],
          "categories": [
            "rings"
          ],
          "needsReview": false
        },
        {
          "title": "Ember Carnelian Anklet",
          "memberLocalIds": [
            "p6"
          ],
          "categories": [
            "anklets",
            "summer jewelry"
          ],
          "needsReview": false
        },
        {
          "title": "Olive Enamel Studs (Green)",
          "memberLocalIds": [
            "p7"
          ],
          "categories": [
            "earrings",
            "enamel jewelry"
          ],
          "needsReview": false
        },
        {
          "title": "Olive Enamel Studs (Blue)",
          "memberLocalIds": [
            "p9"
          ],
          "categories": [
            "earrings",
            "enamel jewelry"
          ],
          "needsReview": false
        },
        {
          "title": "Wildflower Pressed Flower Resin Pendant",
          "memberLocalIds": [
            "p10"
          ],
          "categories": [
            "necklaces",
            "one-of-a-kind",
            "resin jewelry"
          ],
          "needsReview": false
        },
        {
          "title": "Raw Amethyst Leather Wrap Bracelet",
          "memberLocalIds": [
            "p14"
          ],
          "categories": [
            "bracelets",
            "crystal jewelry"
          ],
          "needsReview": true
        }
      ],
      "brandingLocalIds": [
        "p2",
        "p4",
        "p8",
        "p11",
        "p12",
        "p15"
      ]
    }
  },
  "coffee": {
    "shop": {
      "name": "Sumac & Smoke Coffee Roasters",
      "niche": "specialty coffee roaster and cafe selling single-origin beans, brew gear, and branded merch",
      "baseCurrency": "USD",
      "profilePictureDescription": "minimalist logo mark of a stylized coffee cherry over crossed roasting paddles, warm terracotta on cream background"
    },
    "posts": [
      {
        "localId": "p1",
        "mediaType": "VIDEO",
        "caption": "NEW DROP 🚨🔥 Our summer washed Ethiopia is BACK on the roaster today — notes of jasmine, white peach & a syrupy finish that lingers ☕️✨\n\nFirst 30 bags ship Monday. Comment ROAST or DM to reserve 📩\n\n#newroast #ethiopiancoffee #specialtycoffee #singleorigin #roastday #thirdwave #coffeegram",
        "imageDescriptions": [
          "slow-motion reel of dark roasted coffee beans tumbling out of a drum roaster cooling tray, warm amber lighting, steam rising"
        ]
      },
      {
        "localId": "p2",
        "mediaType": "IMAGE",
        "caption": "Yirgacheffe G1 — washed 🇪🇹\nJasmine • white peach • bergamot. Bright, tea-like, gorgeous as a pourover.\n\n250g bag — $19 / 1kg — 64 USD\nDM to order ✨ or grab it at the counter. Link in bio for shipping 🚚\n\n#yirgacheffe #pourover #lightroast #specialtycoffeebeans #ethiopia",
        "imageDescriptions": [
          "kraft paper coffee bag with terracotta label standing upright on a wooden cafe counter, soft window light, plain background"
        ]
      },
      {
        "localId": "p3",
        "mediaType": "CAROUSEL_ALBUM",
        "caption": "Yirgacheffe G1 from every angle 👀 swipe ➡️ that label tho. Restock just landed, shelves are full again 🙌\n\n250g $19 — DM to order or order online (link in bio)\n#yirgacheffe #restock #coffeepackaging #specialtycoffee",
        "imageDescriptions": [
          "kraft coffee bag with terracotta label, front view, on marble countertop",
          "same kraft coffee bag photographed from the side showing the gusset and roast date stamp",
          "top-down flat lay of the same kraft coffee bag next to scattered roasted beans and a brass scoop"
        ]
      },
      {
        "localId": "p4",
        "mediaType": "IMAGE",
        "caption": "Colombia Huila — natural process 🇨🇴 our crowd favourite is back. Big juicy notes of red berry, cocoa & a brown-sugar sweetness. Chefs kiss for espresso 👌\n\n250g / Rs 1200 for our Karachi family 🇵🇰 — local pickup & delivery available, just DM 📩\n#colombiancoffee #espresso #naturalprocess #coffeelovers #karachicoffee",
        "imageDescriptions": [
          "deep burgundy coffee bag with kraft label on a dark slate surface, dramatic side lighting, plain backdrop"
        ]
      },
      {
        "localId": "p5",
        "mediaType": "CAROUSEL_ALBUM",
        "caption": "☕️ THE NEW MENU IS LIVE ☕️ swipe through everything you can get at the bar this season 👉 prices on the board, oat milk always free 🌱\n\nWhich one are you ordering first?? 👇\n#cafemenu #coffeeshop #latteart #seasonalmenu #espressobar #coffeeculture",
        "imageDescriptions": [
          "chalkboard cafe menu listing espresso, flat white, cortado and filter coffee with prices, hanging on exposed brick wall",
          "overhead shot of a flat white with rosetta latte art on a ceramic cup beside a small water glass",
          "iced shaken espresso in a tall glass with oat milk swirl on a marble table",
          "a matcha latte and a cold brew side by side on a wooden tray with a small pastry"
        ]
      },
      {
        "localId": "p6",
        "mediaType": "IMAGE",
        "caption": "Saturday mornings hit different 🌤️☕️ rosetta game strong today thanks to @maya.pulls on bar. come hang, stay a while ❤️\n#latteart #flatwhite #cafelife #slowmornings #baristadaily #coffeeshopvibes",
        "imageDescriptions": [
          "barista hand pouring a rosetta into a flat white at a cafe bar, morning sunlight, lifestyle shot"
        ]
      },
      {
        "localId": "p7",
        "mediaType": "IMAGE",
        "caption": "Merch alert 👕 our heavyweight cream tee — 100% organic cotton, boxy fit, little embroidered cherry on the chest 🍒\n\nS / M / L / XL — $35 each. Limited run!! DM to order ✨ ships worldwide 🌍 link in bio\n#coffeemerch #tee #organiccotton #streetwear #coffeebrand",
        "imageDescriptions": [
          "folded cream heavyweight t-shirt with small embroidered coffee cherry on the chest, flat lay on linen background"
        ]
      },
      {
        "localId": "p8",
        "mediaType": "IMAGE",
        "caption": "And in BLACK 🖤 same heavyweight tee, same boxy fit, embroidered cherry — just for the all-black-everything crew 😎\n\nS–XL / 35 USD. DM to order 📩\n#coffeemerch #blacktee #organiccotton #coffeebrand",
        "imageDescriptions": [
          "folded black heavyweight t-shirt with small embroidered coffee cherry on the chest, flat lay on linen background"
        ]
      },
      {
        "localId": "p9",
        "mediaType": "IMAGE",
        "caption": "Brew better at home ☕️ the classic glass pour-over dripper + 100 filters bundle. Crisp, clean cups every time. Beginner friendly 🙌\n\n$45 the set / 45 USD — DM to order ✨ tutorial reel coming soon\n#pourover #v60 #homebrewing #coffeegear #brewguide #filtercoffee",
        "imageDescriptions": [
          "clear glass cone pour-over dripper on a glass carafe with a stack of white paper filters beside it, bright kitchen counter"
        ]
      },
      {
        "localId": "p10",
        "mediaType": "IMAGE",
        "caption": "the cherry double-wall glasses are kinda perfect for cortados 🤎 keeps your drink hot, your hand cool. set of 2.\n\n1200 — DM for price & shipping, going fast!!\n#glassware #cortado #coffeegear #doublewall #cafestyle",
        "imageDescriptions": [
          "pair of double-wall borosilicate glass cups holding espresso, on a sunlit windowsill, minimal styling"
        ]
      },
      {
        "localId": "p11",
        "mediaType": "VIDEO",
        "caption": "behind the scenes on roast day 🔥 watch the beans go from green to gorgeous. 12 min roast, dropped right at first crack +1:30 🤎 sound on for the crackle asmr 🎧\n#roastday #behindthescenes #coffeeroasting #bts #craftcoffee #smallbatch",
        "imageDescriptions": [
          "reel clip of a roaster checking bean color with a trier from a hot drum roaster, industrial roastery setting, orange glow"
        ]
      },
      {
        "localId": "p12",
        "mediaType": "IMAGE",
        "caption": "we're hiring a weekend barista ☕️💛 6 months+ experience, latte art a plus, good vibes a must. tag someone! apply via link in bio 📝\n#hiring #baristajobs #joinourteam #coffeejobs",
        "imageDescriptions": [
          "cafe interior with empty bar and espresso machine, warm inviting lighting, a small hiring chalkboard sign on the counter"
        ]
      },
      {
        "localId": "p13",
        "mediaType": "IMAGE",
        "caption": "limited holiday gift box 🎁 honestly not sure how many we can make this year, depends on bean supply 🤷 thinking 2 bags + a tee + a brew guide. would you buy?? gauging interest 👇 no firm price yet, maybe ~$70?\n#giftbox #coffeegift #holiday #bundle #comingsoon",
        "imageDescriptions": [
          "loosely arranged gift box with two coffee bags, a folded tee and a brew card on brown crinkle paper, styled but unfinished"
        ]
      },
      {
        "localId": "p14",
        "mediaType": "IMAGE",
        "caption": "Kenya AA — peak season 🇰🇪 blackcurrant, tomato, grapefruit acidity that SLAPS. one of the best lots we've cupped all year honestly.\n\n250g $22 — DM to order ✨ super limited, 18 bags only\n#kenyaaa #specialtycoffee #blackcurrant #brightcoffee #singleorigin #limited",
        "imageDescriptions": [
          "deep green coffee bag with kraft label standing on a concrete surface, single coffee cherry branch beside it, plain background"
        ]
      }
    ],
    "expectations": {
      "products": [
        {
          "title": "Yirgacheffe G1 Washed — Ethiopia (250g / 1kg)",
          "memberLocalIds": [
            "p2",
            "p3"
          ],
          "categories": [
            "Coffee Beans",
            "Single Origin",
            "Light Roast"
          ],
          "needsReview": false
        },
        {
          "title": "Colombia Huila Natural (250g)",
          "memberLocalIds": [
            "p4"
          ],
          "categories": [
            "Coffee Beans",
            "Single Origin",
            "Espresso"
          ],
          "needsReview": false
        },
        {
          "title": "Heavyweight Embroidered Tee — Cream",
          "memberLocalIds": [
            "p7"
          ],
          "categories": [
            "Merch",
            "Apparel"
          ],
          "needsReview": false
        },
        {
          "title": "Heavyweight Embroidered Tee — Black",
          "memberLocalIds": [
            "p8"
          ],
          "categories": [
            "Merch",
            "Apparel"
          ],
          "needsReview": false
        },
        {
          "title": "Glass Pour-Over Dripper + Filters Bundle",
          "memberLocalIds": [
            "p9"
          ],
          "categories": [
            "Brew Gear",
            "Bundle"
          ],
          "needsReview": false
        },
        {
          "title": "Double-Wall Glasses (Set of 2)",
          "memberLocalIds": [
            "p10"
          ],
          "categories": [
            "Brew Gear",
            "Glassware"
          ],
          "needsReview": true
        },
        {
          "title": "Holiday Gift Box (Coming Soon)",
          "memberLocalIds": [
            "p13"
          ],
          "categories": [
            "Bundle",
            "Gift"
          ],
          "needsReview": true
        },
        {
          "title": "Kenya AA — Single Origin (250g)",
          "memberLocalIds": [
            "p14"
          ],
          "categories": [
            "Coffee Beans",
            "Single Origin",
            "Light Roast"
          ],
          "needsReview": false
        }
      ],
      "brandingLocalIds": [
        "p1",
        "p5",
        "p6",
        "p11",
        "p12"
      ]
    }
  },
  "ceramics": {
    "shop": {
      "name": "Emberform Studio",
      "niche": "handmade home & ceramics studio (mugs, vases, planters)",
      "baseCurrency": "USD",
      "profilePictureDescription": "minimal hand-drawn flame-and-bowl logo mark in warm terracotta on a cream background, small ceramics studio brand"
    },
    "posts": [
      {
        "localId": "p1",
        "mediaType": "CAROUSEL_ALBUM",
        "caption": "☀️ SUMMER GLAZE DROP IS LIVE ☀️ swipe to see all the new pieces hitting the shop tonight at 7pm EST! restocks + brand new forms 🧡 set your alarms loves\n\nlink in bio 🔗\n.\n.\n#emberformstudio #handmadeceramics #ceramicdrop #shopupdate #slowmade #pottersofinstagram #supportsmallbusiness",
        "imageDescriptions": [
          "flat-lay of an assortment of handmade ceramic mugs, vases and planters in warm earth tones on a linen cloth",
          "close-up of glossy speckled glaze texture on a ceramic surface, terracotta and cream",
          "studio shelf lined with finished pottery pieces, soft daylight"
        ]
      },
      {
        "localId": "p2",
        "mediaType": "IMAGE",
        "caption": "The Ember speckled mug is BACK in stock 🔥☕️ our bestseller — 10oz, hand-thrown stoneware with a glossy oatmeal speckle glaze. perfect for your morning ritual.\n\n$38 each | DM to order ✨ or grab it via link in bio\n\n#speckledmug #handmademug #stonewaremug #coffeelover #emberformstudio #ceramicmug #wheelthrown",
        "imageDescriptions": [
          "single hand-thrown stoneware coffee mug with oatmeal speckled glaze and a rounded handle, on a wooden table, plain background"
        ]
      },
      {
        "localId": "p3",
        "mediaType": "IMAGE",
        "caption": "morning light + the Ember speckle ☕️ here's the same mug from the side so you can see that chunky handle 🤎 still a few left from the restock!\n\n38 USD · DM to claim 💌\n\n#speckledmug #handmademug #emberformstudio #stoneware #slowliving #coffeetime",
        "imageDescriptions": [
          "the same oatmeal speckled stoneware mug photographed from the side angle showing the thick pulled handle, morning window light"
        ]
      },
      {
        "localId": "p4",
        "mediaType": "VIDEO",
        "caption": "kiln opening day is the BEST day 🔥😍 12 hours of waiting and here's the reveal... sound on for that ceramic ping! ✨ this is why we do it.\n\nbehind the scenes at the studio 🏺\n\n#kilnopening #behindthescenes #potterylife #ceramicprocess #emberformstudio #studioday #makersgonnamake #asmr",
        "imageDescriptions": [
          "hands in heat gloves opening a hot ceramic kiln revealing glowing freshly fired pottery, dim studio, behind-the-scenes reel"
        ]
      },
      {
        "localId": "p5",
        "mediaType": "IMAGE",
        "caption": "Bud vase in 'Sage Matte' 🌿 small but mighty — perfect for a single stem on your windowsill. each one slightly different bc handmade 🤍\n\n$26 | limited run of 8\nDM to order or link in bio 🔗\n\n#budvase #matteglaze #sageceramics #handmadevase #emberformstudio #minimalhome #stemvase",
        "imageDescriptions": [
          "small matte sage-green ceramic bud vase holding a single dried stem, on a white windowsill, minimal styling"
        ]
      },
      {
        "localId": "p6",
        "mediaType": "IMAGE",
        "caption": "Bud vase in 'Terracotta Matte' 🧡 same little form, brand new color for summer! warm rust matte that goes with everything. only made 8 of these too.\n\n$26 each · DM to order ✨\n\n#budvase #terracotta #matteglaze #handmadevase #emberformstudio #warmtones #summerceramics",
        "imageDescriptions": [
          "small matte terracotta rust-colored ceramic bud vase with a single dried stem, on a white windowsill, minimal styling"
        ]
      },
      {
        "localId": "p7",
        "mediaType": "CAROUSEL_ALBUM",
        "caption": "introducing the Hollow planter 🪴 our biggest piece yet! drainage hole + matching saucer included. fits a 4\" nursery pot perfectly. glazed in our signature river-blue reactive glaze so every single one is unique 💙\n\nRs 4500 (intl shipping available, DM for a quote 🌍) | also on the website, link in bio\n\nswipe ➡️ for the drainage detail & the saucer\n\n#planter #ceramicplanter #reactiveglaze #plantsofinstagram #handmadeplanter #emberformstudio #plantmom #indoorgarden #ceramicart",
        "imageDescriptions": [
          "large handmade ceramic planter with glossy river-blue reactive glaze holding a leafy green plant, styled on a wooden stool",
          "underside of the ceramic planter showing the drilled drainage hole",
          "the blue planter sitting on its matching ceramic saucer, side view"
        ]
      },
      {
        "localId": "p8",
        "mediaType": "IMAGE",
        "caption": "weekend studio vibes ☕️🌿 nothing beats a slow saturday at the wheel. what are you all making this weekend? 💬\n\n#studiolife #slowliving #pottersofinstagram #emberformstudio #saturdaymood #creativelife #handsatwork",
        "imageDescriptions": [
          "cozy ceramics studio corner with a pottery wheel, plants, a coffee mug and tools, warm natural light, lifestyle shot with no single product in focus"
        ]
      },
      {
        "localId": "p9",
        "mediaType": "IMAGE",
        "caption": "🚨 SHIPPING UPDATE 🚨 heads up loves — we're closing orders this Friday and taking a 2 week break to restock + rest 🧡 any orders placed after Fri ship the week of the 28th. thank you for your patience & for supporting handmade 🙏\n\n#shopupdate #smallbusiness #shippingupdate #emberformstudio #handmadematters",
        "imageDescriptions": [
          "stack of kraft shipping boxes with twine and a handwritten thank-you note and dried flower, announcement-style flat lay"
        ]
      },
      {
        "localId": "p10",
        "mediaType": "IMAGE",
        "caption": "the Tumble cup set 🤎 set of 2 stackable tumblers, no handle, glazed in warm honey gloss. great for matcha, juice, or a little whiskey 🥃 in collab with @maple.linen.co who made the gorgeous napkins!\n\nset of 2 — 52 USD | DM to order ✨ link in bio\n\n#tumbler #ceramiccup #handmade #emberformstudio #honeyglaze #matchatime #collab",
        "imageDescriptions": [
          "set of two stackable handle-less ceramic tumblers in glossy honey-amber glaze, styled with a linen napkin"
        ]
      },
      {
        "localId": "p11",
        "mediaType": "IMAGE",
        "caption": "experimenting with a new ash glaze on this lil guy 🌑 not sure if these are going up for sale yet... drippy, moody, kind of a happy accident? would you buy one? 👀 might list a couple if there's interest\n\n#glazetest #ashglaze #experimental #wabisabi #emberformstudio #onthewheel #ceramictest",
        "imageDescriptions": [
          "small dark moody ceramic vessel with a drippy reactive ash glaze, dim studio lighting, single object on a turntable"
        ]
      },
      {
        "localId": "p12",
        "mediaType": "IMAGE",
        "caption": "ramen / noodle bowls are here 🍜 wide and deep with a comfy thumb rest on the rim. this one's the 'Charcoal Speckle' glaze. dishwasher + microwave safe!\n\nprice $44 ea\nDM to order 💌\n\n#noodlebowl #ramenbowl #ceramicbowl #handmadepottery #emberformstudio #speckleglaze #dinnerware #foodie",
        "imageDescriptions": [
          "wide deep handmade ceramic noodle bowl in charcoal speckle glaze with a thumb rest on the rim, styled on a dark table"
        ]
      },
      {
        "localId": "p13",
        "mediaType": "IMAGE",
        "caption": "found these little incense holders while sorting the studio 🌫️ pretty sure these were one-offs from last year? a few people asked so... 🤷‍♀️ leaf-shaped dish, catches the ash. take em for 15 each i guess!\n\nDM if you want one 💨\n\n#incenseholder #ceramicdish #emberformstudio #studiofinds #oddsandends #handmade",
        "imageDescriptions": [
          "small leaf-shaped ceramic incense holder dish in pale celadon glaze with an incense stick, plain neutral background"
        ]
      },
      {
        "localId": "p14",
        "mediaType": "IMAGE",
        "caption": "Emberform 🔥 handmade in small batches, one wheel, two hands. thanks for being here 🤍 follow along for drops, restocks + studio life.\n\n#emberformstudio #handmadeceramics #aboutus #smallbatch #pottery #brandstory",
        "imageDescriptions": [
          "the Emberform Studio terracotta flame-and-bowl logo embossed on a clay tile, clean branded close-up"
        ]
      }
    ],
    "expectations": {
      "products": [
        {
          "title": "Ember Speckled Mug",
          "memberLocalIds": [
            "p2",
            "p3"
          ],
          "categories": [
            "mugs",
            "drinkware"
          ],
          "needsReview": false
        },
        {
          "title": "Sage Matte Bud Vase",
          "memberLocalIds": [
            "p5"
          ],
          "categories": [
            "vases",
            "home decor"
          ],
          "needsReview": false
        },
        {
          "title": "Terracotta Matte Bud Vase",
          "memberLocalIds": [
            "p6"
          ],
          "categories": [
            "vases",
            "home decor"
          ],
          "needsReview": false
        },
        {
          "title": "Hollow River-Blue Planter",
          "memberLocalIds": [
            "p7"
          ],
          "categories": [
            "planters",
            "home decor"
          ],
          "needsReview": false
        },
        {
          "title": "Honey Tumble Cup Set",
          "memberLocalIds": [
            "p10"
          ],
          "categories": [
            "drinkware",
            "tumblers"
          ],
          "needsReview": false
        },
        {
          "title": "Charcoal Speckle Noodle Bowl",
          "memberLocalIds": [
            "p12"
          ],
          "categories": [
            "bowls",
            "dinnerware"
          ],
          "needsReview": false
        },
        {
          "title": "Ash Glaze Experimental Vessel",
          "memberLocalIds": [
            "p11"
          ],
          "categories": [
            "vases",
            "home decor"
          ],
          "needsReview": true
        },
        {
          "title": "Leaf Incense Holder",
          "memberLocalIds": [
            "p13"
          ],
          "categories": [
            "home decor",
            "accessories"
          ],
          "needsReview": true
        }
      ],
      "brandingLocalIds": [
        "p1",
        "p4",
        "p8",
        "p9",
        "p14"
      ]
    }
  }
}
