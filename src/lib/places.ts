/**
 * Destination typo-tolerance.
 *
 * A curated list of every country plus major tourist cities, with a small
 * Levenshtein matcher. `suggestCorrection("Switzrland")` → "Switzerland".
 * Runs instantly in the browser — no API call, works offline.
 */

const RAW_PLACES = `
Afghanistan, Albania, Algeria, Andorra, Angola, Antigua and Barbuda, Argentina, Armenia, Australia, Austria,
Azerbaijan, Bahamas, Bahrain, Bangladesh, Barbados, Belarus, Belgium, Belize, Benin, Bhutan, Bolivia,
Bosnia and Herzegovina, Botswana, Brazil, Brunei, Bulgaria, Burkina Faso, Burundi, Cambodia, Cameroon, Canada,
Cape Verde, Central African Republic, Chad, Chile, China, Colombia, Comoros, Costa Rica, Croatia, Cuba,
Cyprus, Czech Republic, Denmark, Djibouti, Dominica, Dominican Republic, Ecuador, Egypt, El Salvador,
Equatorial Guinea, Eritrea, Estonia, Eswatini, Ethiopia, Fiji, Finland, France, Gabon, Gambia, Georgia,
Germany, Ghana, Greece, Grenada, Guatemala, Guinea, Guyana, Haiti, Honduras, Hungary, Iceland, India,
Indonesia, Iran, Iraq, Ireland, Israel, Italy, Ivory Coast, Jamaica, Japan, Jordan, Kazakhstan, Kenya,
Kiribati, Kuwait, Kyrgyzstan, Laos, Latvia, Lebanon, Lesotho, Liberia, Libya, Liechtenstein, Lithuania,
Luxembourg, Madagascar, Malawi, Malaysia, Maldives, Mali, Malta, Mauritania, Mauritius, Mexico, Moldova,
Monaco, Mongolia, Montenegro, Morocco, Mozambique, Myanmar, Namibia, Nauru, Nepal, Netherlands,
New Zealand, Nicaragua, Niger, Nigeria, North Korea, North Macedonia, Norway, Oman, Pakistan, Palau,
Palestine, Panama, Papua New Guinea, Paraguay, Peru, Philippines, Poland, Portugal, Qatar, Romania, Russia,
Rwanda, Saint Lucia, Samoa, San Marino, Saudi Arabia, Senegal, Serbia, Seychelles, Sierra Leone, Singapore,
Slovakia, Slovenia, Solomon Islands, Somalia, South Africa, South Korea, South Sudan, Spain, Sri Lanka,
Sudan, Suriname, Sweden, Switzerland, Syria, Taiwan, Tajikistan, Tanzania, Thailand, Timor-Leste, Togo,
Tonga, Trinidad and Tobago, Tunisia, Turkey, Turkmenistan, Tuvalu, Uganda, Ukraine, United Arab Emirates,
United Kingdom, United States, Uruguay, Uzbekistan, Vanuatu, Vatican City, Venezuela, Vietnam, Yemen,
Zambia, Zimbabwe,
Amsterdam, Athens, Auckland, Baku, Bali, Bangkok, Barcelona, Beijing, Beirut, Berlin, Bogota, Bruges,
Brussels, Budapest, Busan, Cappadocia, Cancun, Cape Town, Cartagena, Cebu, Chiang Mai, Chicago, Colombo,
Copenhagen, Cusco, Da Nang, Delhi, Dubai, Dublin, Edinburgh, Florence, Geneva, Gothenburg, Goa, Granada,
Guangzhou, Hanoi, Hawaii, Helsinki, Ho Chi Minh City, Hong Kong, Innsbruck, Interlaken, Istanbul, Jaipur,
Jakarta, Jerusalem, Kathmandu, Krakow, Kuala Lumpur, Kyoto, Lagos, Las Vegas, Lisbon, Liverpool, London,
Lucerne, Ljubljana, Madrid, Male, Manchester, Manila, Marrakech, Melbourne, Mexico City, Miami, Milan,
Mumbai, Munich, Muscat, Nairobi, Naples, New Orleans, New York, Nice, Osaka, Oslo, Oaxaca, Paris, Perth,
Phuket, Porto, Prague, Queenstown, Quito, Reykjavik, Rio de Janeiro, Rome, Salzburg, San Francisco,
Santiago, Sao Paulo, Sarajevo, Seattle, Seoul, Seville, Shanghai, Singapore, Split, Stockholm, Sydney,
Taipei, Tallinn, Tehran, Thimphu, Tirana, Tokyo, Toronto, Toulouse, Tunis, Turin, Udaipur, Vancouver,
Venice, Vienna, Warsaw, Washington, Yangon, Yaounde, Yerevan, Zanzibar, Zermatt, Zurich, Kerala, Rajasthan,
Kolkata, Chennai, Ahmedabad, Patagonia, Tuscany, Santorini, Mykonos, Silicon Valley, Yellowstone, Banff
`;

const PLACES = RAW_PLACES.split(",")
  .map((p) => p.trim())
  .filter(Boolean);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z ]/g, "")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[n];
}

const ALIASES: Record<string, string> = {
  usa: "United States",
  us: "United States",
  america: "United States",
  uk: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  uae: "United Arab Emirates",
  emirates: "United Arab Emirates",
  holland: "Netherlands",
  czech: "Czech Republic",
  ivorycoast: "Ivory Coast",
  srilanka: "Sri Lanka",
  saudi: "Saudi Arabia",
  southkorea: "South Korea",
  northkorea: "North Korea",
  newzealand: "New Zealand",
  // alternate / historical names and common transliterations
  venizia: "Venice",
  venezia: "Venice",
  bombay: "Mumbai",
  madras: "Chennai",
  peking: "Beijing",
  saigon: "Ho Chi Minh City",
  burma: "Myanmar",
  ceylon: "Sri Lanka",
  persia: "Iran",
  siam: "Thailand",
  kolkatta: "Kolkata",
  canton: "Guangzhou",
};

/**
 * Returns the corrected place name for an obvious typo, or null when the
 * input is exact, too short to judge, or not close to anything we know.
 */
export function suggestCorrection(input: string): string | null {
  const q = normalize(input);
  if (ALIASES[q]) return ALIASES[q];
  if (q.length < 4) return null;

  let best: string | null = null;
  let bestDist = Infinity;

  for (const place of PLACES) {
    const p = normalize(place);
    if (p === q) return null; // already correct

    let dist = levenshtein(q, p);
    // typing a leading chunk of a name ("itali", "switz") counts as near
    if (p.startsWith(q) && q.length >= 4) dist = Math.min(dist, 1);

    const maxDist = q.length <= 5 ? 1 : q.length <= 9 ? 2 : 3;
    if (dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      best = place;
    }
  }
  return best;
}

/** True when two destination strings refer to the same place, loosely. */
export function samePlace(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}
