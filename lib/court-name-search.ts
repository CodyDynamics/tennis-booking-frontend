/**
 * Court name filter for admin search.
 * - Trailing whitespace in the query → exact match (case-insensitive), e.g. `"Court 1 "`
 *   matches only the court named Court 1.
 * - Otherwise → normal substring match (e.g. `"Court 1"` matches Court 1, 10, 11, …).
 */
export function courtNameMatchesSearch(name: string, rawQuery: string): boolean {
  const qTrim = rawQuery.trim();
  if (!qTrim) return true;
  const nLower = name.trim().toLowerCase();
  const wantsExact = rawQuery.length > rawQuery.trimEnd().length;
  if (wantsExact) {
    const needle = rawQuery.trimEnd().trim().toLowerCase();
    return nLower === needle;
  }
  return nLower.includes(qTrim.toLowerCase());
}
