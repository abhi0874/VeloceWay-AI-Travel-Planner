/**
 * Offline sample payloads.
 *
 * These power three things:
 *   1. the app's no-key demo mode (explore everything without an AI account)
 *   2. sandbox verification of the API handlers end-to-end
 *   3. a shape reference for the real prompt schema
 *
 * The sample matches the hero card's example: 7 days in Kyoto in October,
 * loving food, hidden cafes and scenic hikes while avoiding crowds.
 */

export const MOCK_PLAN = {
  tripSummary: {
    destination: "Kyoto",
    country: "Japan",
    bestSeasons: ["October–November", "Late March–April", "Late May"],
    vibeTags: ["food", "hidden cafes", "scenic hikes", "quiet corners"],
    whyGo:
      "Kyoto in October is maple-hiked temple trails by morning and kissaten coffee by afternoon — peak color hasn't peaked yet, so crowds are kinder.",
    currency: "JPY (¥)",
    dailyFoodBudget: "~¥4,000–7,000 (≈ $28–48)",
    languageTip:
      "A bow and 'sumimasen' opens most doors; menus in Nishiki side streets are often Japanese-only — point politely.",
    safetyNote:
      "Very safe for solo and night walking; carry ¥ cash — small cafes and shrines often don't take cards.",
  },
  travelOptions: {
    flight: {
      estimate: "~$700–1,100 round-trip economy to Osaka KIX from most hubs",
      notes: [
        "Fly into KIX, then the Haruka express hits Kyoto Station in ~75 min (~¥3,110).",
        "Tuesday/Wednesday departures in October run ~15% cheaper than weekends.",
        "Book 6–10 weeks out; October is shoulder-peak in Japan.",
      ],
    },
    train: {
      estimate: "Shinkansen Tokyo→Kyoto ~¥14,170 one-way; 7-day JR Pass ~¥50,000",
      notes: [
        "Only worth a JR Pass if you'll leave Kansai — otherwise buy single Shinkansen tickets.",
        "Reserved seats on the Nozomi fill fast for late-October weekends.",
      ],
    },
    ownVehicle: {
      estimate: "Rental ~¥7,000–12,000/day + fuel ~¥175/L; city parking ~¥400–600/hr",
      notes: [
        "Skip the car inside Kyoto — buses and trains beat traffic every time.",
        "Rent one day only for Kurama–Ohara countryside stops if you must.",
        "International visitors need an IDP issued before arrival.",
      ],
    },
  },
  routes: {
    roadPossible: true,
    roadNote:
      "Fully road-connected via the Tomei and Shin-Meishin expressways; expect tolls and weekend traffic around Mt Fuji.",
    intercity: [
      {
        mode: "flight",
        from: "Tokyo (HND/NRT)",
        to: "Osaka KIX / Itami",
        via: "Flight ~1h15 + ~75 min Haruka express into Kyoto",
        distanceKm: 450,
        duration: "~3h 30m door to door",
        approxCost: "~¥15,000–28,000 one way",
        note: "Only wins over the train if you're flying in from further afield anyway.",
      },
      {
        mode: "train",
        from: "Tokyo Station",
        to: "Kyoto Station",
        via: "Tōkaidō Shinkansen Nozomi, direct",
        distanceKm: 515,
        duration: "~2h 15m",
        approxCost: "~¥14,170 one way reserved",
        note: "Departs every ~10 minutes; sit on the right (D/E) for Mt Fuji views.",
      },
      {
        mode: "bus",
        from: "Shinjuku Expressway Bus Terminal",
        to: "Kyoto Station Hachijō",
        via: "Meishin expressway, overnight service",
        distanceKm: 470,
        duration: "~7h 30m overnight",
        approxCost: "~¥5,000–10,000 one way",
        note: "Cheapest by far — and saves a night's accommodation.",
      },
      {
        mode: "ownVehicle",
        from: "Tokyo",
        to: "Kyoto",
        via: "Tomei → Shin-Meishin expressway (Gotemba & Hamamatsu stops)",
        distanceKm: 460,
        duration: "~6h 30m plus breaks",
        approxCost: "~¥9,000 tolls + ~¥6,500 fuel",
        note: "Scenic Mt Fuji foothill stretch; avoid Golden Week traffic.",
      },
    ],
    local: [
      {
        place: "Fushimi Inari Taisha",
        fromArea: "Kawaramachi",
        distanceKm: 7,
        options: [
          { mode: "JR Nara line train", duration: "18 min", approxCost: "¥150" },
          { mode: "City bus 205", duration: "35 min", approxCost: "¥230" },
          { mode: "Taxi", duration: "25 min", approxCost: "~¥2,000" },
        ],
        best: "Train — fastest and cheapest combined",
        note: "Go before 8am; the trail stays open after dark.",
      },
      {
        place: "Arashiyama bamboo grove",
        fromArea: "Kawaramachi",
        distanceKm: 12,
        options: [
          { mode: "JR Sagano line", duration: "16 min + 10 min walk", approxCost: "¥240" },
          { mode: "Taxi", duration: "30 min", approxCost: "~¥2,800" },
          { mode: "Rental bicycle", duration: "45 min", approxCost: "~¥1,000/day" },
        ],
        best: "Train — beats traffic entirely",
        note: "Enter via the Okochi Sanso side for calm.",
      },
      {
        place: "Nishiki Market",
        fromArea: "Kawaramachi",
        distanceKm: 1.2,
        options: [
          { mode: "Walking", duration: "15 min", approxCost: "Free" },
          { mode: "Taxi", duration: "6 min", approxCost: "~¥900" },
        ],
        best: "Walking — it's faster than any vehicle",
        note: "Combine with Teramachi arcades next door.",
      },
      {
        place: "Kiyomizu-dera",
        fromArea: "Kawaramachi",
        distanceKm: 3,
        options: [
          { mode: "City bus 206", duration: "20 min", approxCost: "¥230" },
          { mode: "Taxi", duration: "12 min", approxCost: "~¥1,200" },
          { mode: "Walking", duration: "40 min uphill", approxCost: "Free" },
        ],
        best: "Bus — cheapest reasonable option",
        note: "The uphill walk is steep; save your legs for the temple slopes.",
      },
    ],
    cheapest: {
      mode: "Overnight highway bus",
      summary:
        "Tokyo→Kyoto from ~¥5,000 — a third of the train fare, and you sleep through the ride and skip one night's stay.",
    },
    fastest: {
      mode: "Shinkansen Nozomi",
      summary:
        "Tokyo→Kyoto in 2h 15m — faster than flying once airport transfers count; trains run every 10 minutes.",
    },
  },
  stays: [
    {
      name: "Len Kyoto Kawaramachi",
      area: "Kawaramachi",
      type: "budget",
      approxPerNight: 3500,
      why: "Hostel-cafe hybrid on the river; breakfast is a proper pour-over affair.",
    },
    {
      name: "The Millennials Kyoto",
      area: "Karasuma",
      type: "budget",
      approxPerNight: 4800,
      why: "Smart capsules with lounge workspaces, 4 min from Karasuma Oike station.",
    },
    {
      name: "Ryokan Shimizu",
      area: "Gion",
      type: "mid-range",
      approxPerNight: 14000,
      why: "Family-run tatami rooms steps from Yasaka Shrine; legendary breakfast rice set.",
    },
    {
      name: "Cross Hotel Kyoto",
      area: "Kawaramachi Sanjo",
      type: "mid-range",
      approxPerNight: 18000,
      why: "Canal-side location between Pontocho alley and Nishiki Market.",
    },
    {
      name: "Hoshinoya Kyoto",
      area: "Arashiyama",
      type: "luxury",
      approxPerNight: 110000,
      why: "Boat-access-only ryokan on the Hozugawa river — the quietest luxury in the city.",
    },
  ],
  dayByDay: [
    {
      day: 1,
      title: "Arrival & riverside dusk",
      morning:
        "Land KIX → Haruka express to Kyoto; drop bags at Kawaramachi hotel.",
      afternoon:
        "Slow wander along the Kamogawa delta; coffee at % Arabica Higashiyama before the queue forms.",
      evening:
        "Pontocho alley dinner — grilled fish teishoku at a lantern-lit counter bar.",
      stayArea: "Kawaramachi",
    },
    {
      day: 2,
      title: "Hidden north temples",
      morning:
        "Bus 204 to Imamiya Shrine — mostly locals, moss gardens, free.",
      afternoon:
        "Walk the Takeisao-jinja hillside; kelp tea at a 500-year-old aburi-mochi shop.",
      evening:
        "Izakaya crawl on Kiyamachi's quieter northern blocks.",
      stayArea: "Kawaramachi",
    },
    {
      day: 3,
      title: "Fushimi without the crush",
      morning:
        "Fushimi Inari at 7am — hike past station 4 where the torii thin out and silence starts.",
      afternoon:
        "Sake district tastings in Fushimi's canal quarter; sake soft-serve at Gekkeikan.",
      evening: "Train back; soba at a hand-made noodle counter near Tofukuji.",
      stayArea: "Kawaramachi",
    },
    {
      day: 4,
      title: "Arashiyama, back door first",
      morning:
        "Enter bamboo grove via Okochi Sanso villa gate at opening; garden admission includes matcha.",
      afternoon:
        "Monkey park ridge trail — city panorama minus the crowd; riverside coffee at % Arashiyama.",
      evening:
        "Kaiseki-lite bento picnic by the Hozugawa as the lanterns come on.",
      stayArea: "Arashiyama",
    },
    {
      day: 5,
      title: "Philosopher's Path & hikes",
      morning:
        "Nanzen-ji aqueduct tunnels early, then the full Philosopher's Path stroll southward.",
      afternoon:
        "Daimon-ji trailhead leg-stretcher (45 min up) for rooftop city views.",
      evening: "Omakase-style tofu kaiseki near Nanzen-ji — the local speciality.",
      stayArea: "Higashiyama",
    },
    {
      day: 6,
      title: "Cafes & crafts day",
      morning:
        "Kissaten marathon: Smart Coffee (1948) → Coffee House Nagao → franco for pancakes.",
      afternoon:
        "Nishiki Market graze; knife shopping on Teramachi; yatsuhashi tasting flight.",
      evening:
        "Sunset from Shosei-en garden; ramen counter finish on the north side of Kyoto Station.",
      stayArea: "Kawaramachi",
    },
    {
      day: 7,
      title: "Slow goodbye",
      morning:
        "Morning bath + garden sit at your ryokan; last tamago sando from Lawson (trust us).",
      afternoon:
        "Souvenir sweep at Kyoto Handicraft Center; Haruka express back to KIX.",
      evening: "Fly home already planning the November return for peak momiji.",
      stayArea: "—",
    },
  ],
  attractions: [
    { name: "Fushimi Inari Taisha", category: "shrine / hike", mustSee: true, bestTime: "Before 8am", entryFee: "Free" },
    { name: "Okochi Sanso Villa", category: "garden", mustSee: true, bestTime: "Opening hour", entryFee: "¥1,000 incl. matcha" },
    { name: "Nanzen-ji Aqueduct", category: "temple grounds", mustSee: true, bestTime: "Early morning", entryFee: "Free (grounds)" },
    { name: "Nishiki Market", category: "food street", mustSee: true, bestTime: "11am–2pm", entryFee: "Free" },
    { name: "Kamogawa Delta", category: "riverside walk", mustSee: false, bestTime: "Golden hour", entryFee: "Free" },
    { name: "Imamiya Shrine", category: "local shrine", mustSee: false, bestTime: "Anytime", entryFee: "Free" },
    { name: "Daimon-ji Trail", category: "hike", mustSee: false, bestTime: "Clear afternoons", entryFee: "Free" },
    { name: "Shosei-en Garden", category: "garden", mustSee: false, bestTime: "Sunset", entryFee: "¥500" },
    { name: "Teramachi arcades", category: "crafts & cafes", mustSee: false, bestTime: "Afternoon", entryFee: "Free" },
    { name: "Pontocho Alley", category: "dining lane", mustSee: true, bestTime: "After dark", entryFee: "Free" },
  ],
  nearbyDestinations: [
    { name: "Nara", distanceKm: 42, travelTime: "45 min by Kintetsu", whyVisit: "Bowing deer and Todai-ji's Great Buddha; doable as a half-day." },
    { name: "Osaka", distanceKm: 55, travelTime: "30 min by express", whyVisit: "Neon food chaos antidote to Kyoto calm — takoyaki in Dotonbori." },
    { name: "Uji", distanceKm: 20, travelTime: "20 min by JR Nara line", whyVisit: "Matcha's birthplace: Byodo-in, tea whisking classes, river walks." },
    { name: "Ohara", distanceKm: 18, travelTime: "50 min bus", whyVisit: "Sanzen-in's moss halls and farm-road silence; October = red begonias." },
    { name: "Kurama–Kibune", distanceKm: 22, travelTime: "30 min train + hike", whyVisit: "Temple-mountain hike between two villages, onsen finish at Kurama." },
    { name: "Hikone", distanceKm: 90, travelTime: "55 min Shinkansen + hop", whyVisit: "An original 1606 castle keep — uncrowded even in peak season." },
  ],
  localTransport: [
    { mode: "IC card (ICOCA/Suica)", detail: "Tap onto buses, subway, trains; works in konbini too.", approxCost: "¥500 deposit + top-ups" },
    { mode: "City buses", detail: "Flat ¥230 anywhere inside the grid; day pass ¥700.", approxCost: "¥230/ride" },
    { mode: "Karashimo-kiku subway pass", detail: "One-day unlimited Tozai+Karasuma lines for tourists.", approxCost: "¥600/day" },
    { mode: "Rental bicycle", detail: "Flat city = perfect cycling; Ecutekku rentals by the day.", approxCost: "¥1,000–1,500/day" },
    { mode: "Taxi", detail: "Clean, honest meters; useful after midnight when buses stop.", approxCost: "~¥1,000 flag + distance" },
  ],
  seasonNotes:
    "October sits just before peak autumn color (which lands mid-November): daytime ~19°C, evenings ~11°C, occasional typhoon-tail rain early month. Crowds build steadily toward month-end — front-load famous sights into week one or go early each morning. Jidai Matsuri festival parades through on Oct 22.",
  packingTips: [
    "Layered clothing — 8°C swing between noon and night.",
    "Compact umbrella; October rain arrives sideways.",
    "Broken-in hiking shoes for Fushimi and Daimon-ji trails.",
    "Cash pouch — small cafes and shrine boxes are cash-only.",
    "Coin purse: shrines, buses and vending machines run on ¥100s.",
    "Portable wifi or eSIM setup done BEFORE landing (airport counters queue).",
  ],
  estimatedTotal: {
    budget: "~$950 per person (hostels, buses, counter dining)",
    mid: "~$1,900 per person (3★ hotels, mix of casual + one kaiseki)",
    luxury: "$4,500+ per person (ryokan stays, private guides, taxis)",
  },
  bookingHints: [
    "Reserve JR/Haruka seats online up to 1 month ahead via the JR-West 'e5489' site.",
    "Book any ryokan with dinner 2–3 months out — October fills first.",
    "Popular kissaten don't take bookings; arrive at opening for window seats.",
    "Buy the ICOCA card at KIX arrivals before boarding the Haruka.",
    "TeamLab-type ticketed exhibitions sell out — check what's running during your dates.",
  ],
};

export const MOCK_SUGGEST = {
  destinations: [
    {
      name: "Kyoto",
      country: "Japan",
      bestMonths: ["October", "November"],
      moods: ["food", "hidden gems", "culture"],
      why: "Maple season begins, cafe culture peaks, and early-month crowds haven't arrived yet.",
      highlight: "Dawn hike up Fushimi Inari past the last tourists.",
      avgFlightHint: "~$700–1,100 RT to KIX from major hubs",
      dailyBudget: { currency: "JPY (¥)", budget: "~¥8,000", mid: "~¥18,000" },
    },
    {
      name: "Tbilisi",
      country: "Georgia",
      bestMonths: ["September", "October"],
      moods: ["food", "hidden gems", "nightlife"],
      why: "Wine harvest season in the world's oldest wine region, plus sulfur baths under chestnut leaves.",
      highlight: "A family supra feast in a Kakheti village vineyard.",
      avgFlightHint: "~$450–750 RT via Istanbul or Warsaw",
      dailyBudget: { currency: "GEL (₾)", budget: "~₾90", mid: "~₾220" },
    },
    {
      name: "Oaxaca",
      country: "Mexico",
      bestMonths: ["October", "November"],
      moods: ["food", "culture", "hidden gems"],
      why: "Día de Muertos builds all month; mezcal palenques and mole negro at their moodiest.",
      highlight: "Cemetery vigils in Xoxocotlán on the night of Oct 31.",
      avgFlightHint: "~$350–600 RT via CDMX",
      dailyBudget: { currency: "MXN ($)", budget: "~$550 MXN", mid: "~$1,400 MXN" },
    },
    {
      name: "Luang Prabang",
      country: "Laos",
      bestMonths: ["November", "December"],
      moods: ["nature", "slow travel"],
      why: "River mists lift, waterfalls refill, and alms-giving mornings feel unhurried again.",
      highlight: "Kuang Si falls before 8am, turquoise and empty.",
      avgFlightHint: "~$500–800 RT via Bangkok or Hanoi",
      dailyBudget: { currency: "USD ($)", budget: "~$25", mid: "~$70" },
    },
    {
      name: "South Tyrol",
      country: "Italy",
      bestMonths: ["October"],
      moods: ["scenic hikes", "food", "slow travel"],
      why: "Larch forests turn gold over the Dolomites and every village hut pours new wine with roast chestnuts.",
      highlight: "The Seceda ridgeline at sunrise, cable car empty.",
      avgFlightHint: "~$300–550 RT via Milan or Munich",
      dailyBudget: { currency: "EUR (€)", budget: "~€60", mid: "~€140" },
    },
    {
      name: "Jeju",
      country: "South Korea",
      bestMonths: ["October", "November"],
      moods: ["nature", "food", "hidden gems"],
      why: "Silver grass waves on Hallasan, black-pork BBQ weather, and coastal olle trails in clear air.",
      highlight: "Seongsan Ilchulbong sunrise before the tour vans arrive.",
      avgFlightHint: "~$550–850 RT via Seoul",
      dailyBudget: { currency: "KRW (₩)", budget: "~₩65,000", mid: "~₩150,000" },
    },
  ],
};
