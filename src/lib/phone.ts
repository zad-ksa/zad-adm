/**
 * Saudi mobile normalisation, shared by client and server.
 *
 * It lives here rather than inside a "use server" module because the add-staff
 * form needs the exact same rules the action uses: the browser decides when a
 * number is complete enough to look up, and keys its result cache by the
 * canonical form. If the two sides disagreed, the UI would either fire lookups
 * for numbers the server rejects, or cache two spellings of one number under
 * different keys and show a stale answer.
 */

/** "05XXXXXXXX", or null when the input is not a Saudi mobile. */
export function normalizeSaudiPhone(raw: string): string | null {
  const digits = (raw || "").replace(/[\s-]/g, "").trim();
  if (!/^(?:\+?966|0)?5\d{8}$/.test(digits)) return null;
  const local = digits.replace(/^\+?966/, "").replace(/^0/, "");
  return "0" + local;
}

/** Every spelling of a canonical number that may exist in the database. */
export function saudiPhoneVariants(canonical: string): string[] {
  const bare = canonical.replace(/^0/, "");
  return [canonical, bare, "966" + bare, "+966" + bare];
}
