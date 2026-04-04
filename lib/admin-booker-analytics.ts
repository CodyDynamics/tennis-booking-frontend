/**
 * Deterministic mock / exploratory analytics for admin drill-down rows.
 * Swap for API-driven blocks when a backend endpoint exists.
 */

export type AnalyticsChartBlock =
  | {
      id: string;
      title: string;
      subtitle?: string;
      variant: "bar";
      data: { label: string; value: number }[];
    }
  | {
      id: string;
      title: string;
      subtitle?: string;
      variant: "line";
      data: { label: string; value: number }[];
    };

function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickVariant(seed: number, i: number): number {
  return (seed + i * 17) % 97;
}

/**
 * Builds chart sections for the “Analytics” popup. Inputs are intentionally generic
 * so callers can later pass real aggregates from the API.
 */
export function buildBookerAnalyticsBlocks(input: {
  userId: string;
  email: string;
  sport: string;
  bookingCount: number;
}): AnalyticsChartBlock[] {
  const seed = seedFromString(`${input.userId}:${input.email}:${input.sport}`);
  const base = Math.max(1, input.bookingCount);

  const hourLabels = ["6–8", "8–10", "10–12", "12–14", "14–16", "16–18", "18–20", "20–22"];
  const hoursData = hourLabels.map((label, i) => {
    const v = pickVariant(seed, i);
    const weight = 0.35 + (v % 50) / 100;
    return { label: `${label}h`, value: Math.max(1, Math.round(base * weight * (0.2 + (i % 4) * 0.15))) };
  });

  const sportPool = [
    input.sport,
    input.sport === "tennis" ? "pickleball" : "tennis",
    "ball-machine",
    "unknown",
  ];
  const sportsData = sportPool.map((sp, i) => ({
    label: sp === "unknown" ? "Other" : sp.replace(/-/g, " "),
    value: Math.max(1, Math.round(base * (0.5 + (pickVariant(seed, i + 10) % 40) / 100))),
  }));

  const trendData = Array.from({ length: 7 }, (_, i) => ({
    label: `D${i + 1}`,
    value: Math.max(0, Math.round(base * (0.3 + (pickVariant(seed, i + 20) % 60) / 100))),
  }));

  const blocks: AnalyticsChartBlock[] = [
    {
      id: "hours",
      title: "Bookings by time window",
      subtitle: "Relative frequency in typical day parts (demo distribution)",
      variant: "bar",
      data: hoursData,
    },
    {
      id: "sports",
      title: "Activity by sport",
      subtitle: "Mix across sports for this profile (demo)",
      variant: "bar",
      data: sportsData,
    },
    {
      id: "trend",
      title: "Recent rhythm",
      subtitle: "Last 7 sessions — relative intensity (demo)",
      variant: "line",
      data: trendData,
    },
  ];

  return blocks;
}
