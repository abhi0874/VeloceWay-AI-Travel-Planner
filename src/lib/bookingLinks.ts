import type { TripPlan } from "./types";

export interface BookingLink {
  label: string;
  url: string;
}

/**
 * Free booking deep-links. VeloceWay never sells tickets and takes no
 * commission — these open the provider's own search so live fares are
 * checked where they're actually sold.
 */
export function buildBookingLinks(plan: TripPlan): BookingLink[] {
  const dest = plan.tripSummary?.destination || "";
  const country = plan.tripSummary?.country || "";
  const q = encodeURIComponent(`${dest} ${country}`.trim() || "your destination");

  const links: BookingLink[] = [
    {
      label: "Flights — Google Flights",
      url: `https://www.google.com/travel/flights?q=flights%20to%20${q}`,
    },
    {
      label: "Stays — Booking.com",
      url: `https://www.booking.com/searchresults.html?ss=${q}`,
    },
    {
      label: "Trains worldwide — Seat61",
      url: "https://www.seat61.com/",
    },
  ];

  if (/india/i.test(country) || /india/i.test(dest)) {
    links.push({
      label: "Trains — IRCTC",
      url: "https://www.irctc.co.in/nget/train-search",
    });
    links.push({
      label: "Buses — RedBus",
      url: "https://www.redbus.in/",
    });
  }

  return links;
}
