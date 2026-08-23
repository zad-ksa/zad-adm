/**
 * Geofencing + network-origin math for attendance.
 *
 * HARD RULE: every function here runs on the SERVER, on raw coordinates sent by
 * the client. The client never sends a derived value (distance, "inRange",
 * workDate) and the server never reads one if it does — otherwise spoofing the
 * whole system reduces to editing `distance: 0` into the request body.
 *
 * The coordinates themselves are still spoofable (Chrome DevTools → Sensors →
 * Custom location, no technical skill needed). This module makes the geofence a
 * deterrent plus an auditable record, not a hard barrier; the IP layer below is
 * the part that is genuinely hard to fake.
 */

const EARTH_RADIUS_M = 6371008.8; // IUGG mean Earth radius

/** Great-circle distance in metres between two WGS84 points. */
export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rejects anything that is not a finite coordinate in valid WGS84 range. */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Reading quality thresholds, in metres, as reported by the device.
 *
 * A Wi-Fi/cell-tower fix inside a concrete building is routinely 50–2000 m off.
 * Rejecting outright on a poor reading would lock out honest staff standing in
 * the office, so a bad reading asks for a retry rather than counting as a
 * failed attendance — see ACCURACY_RETRY_THRESHOLD_M usage in actions/attendance.
 */
export const ACCURACY_RETRY_THRESHOLD_M = 200;
/** Below this, an unchanging reading day after day is itself a spoofing tell. */
export const SUSPICIOUSLY_PERFECT_ACCURACY_M = 5;

export type GeofenceCheck = {
  /** Distance from the site centre, computed here, never received. */
  distance: number;
  withinRange: boolean;
  /** True when the reading is too coarse to decide — ask the user to retry. */
  accuracyTooLow: boolean;
};

/**
 * `accuracy` is added to the allowed radius rather than subtracted: a device
 * reporting "I am here ± 80 m" while sitting 170 m from a 150 m fence may well
 * be standing inside it. Being generous here shifts the failure mode from
 * "honest employee cannot check in" to "a marginal case is recorded and
 * reviewable", which is the right trade for a deterrent system.
 */
export function evaluateGeofence(
  distance: number,
  radiusMeters: number,
  accuracy: number | null | undefined
): GeofenceCheck {
  const acc = typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : 0;
  const tolerance = Math.min(acc, ACCURACY_RETRY_THRESHOLD_M);
  return {
    distance,
    withinRange: distance <= radiusMeters + tolerance,
    accuracyTooLow: acc > ACCURACY_RETRY_THRESHOLD_M,
  };
}

export type NearestSite<T extends { latitude: number; longitude: number }> = {
  site: T;
  check: GeofenceCheck;
};

/**
 * Picks the site the user is actually at. A charity may have several branches;
 * "nearest that they are inside" beats "first in the list", and if they are
 * inside none, the nearest one is still returned so the error message can say
 * how far off they were.
 */
export function findNearestSite<
  T extends { latitude: number; longitude: number; radiusMeters: number }
>(sites: T[], lat: number, lng: number, accuracy: number | null | undefined): NearestSite<T> | null {
  let best: NearestSite<T> | null = null;

  for (const site of sites) {
    const distance = haversineMeters(lat, lng, site.latitude, site.longitude);
    const check = evaluateGeofence(distance, site.radiusMeters, accuracy);
    if (!best || distance < best.check.distance) best = { site, check };
  }

  return best;
}

/** Metres per second beyond which two consecutive fixes imply teleportation. */
const IMPOSSIBLE_SPEED_MPS = 90; // ~324 km/h — above any ground travel

/**
 * Impossible-travel check between the previous recorded fix and this one.
 * A flag for human review, never an automatic rejection: a VPN switch or a
 * genuinely bad earlier reading can trip it.
 */
export function isImpossibleTravel(
  prevLat: number,
  prevLng: number,
  prevAt: Date,
  lat: number,
  lng: number,
  at: Date
): boolean {
  const seconds = (at.getTime() - prevAt.getTime()) / 1000;
  if (seconds <= 0) return false;
  const meters = haversineMeters(prevLat, prevLng, lat, lng);
  if (meters < 1000) return false; // ignore GPS jitter at rest
  return meters / seconds > IMPOSSIBLE_SPEED_MPS;
}

// ---------------------------------------------------------------------------
// Network origin (the IP layer)
// ---------------------------------------------------------------------------

function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

/** Strips an IPv6-mapped IPv4 prefix and any :port suffix. */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  // "1.2.3.4:5678" — only for IPv4; a bare IPv6 also contains colons.
  const v4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(ip);
  if (v4WithPort) ip = v4WithPort[1];
  return ip.toLowerCase() || null;
}

/**
 * Matches an IP against one entry of the allow list. Accepted forms:
 *   - exact IPv4        "212.118.5.10"
 *   - IPv4 CIDR         "212.118.5.0/24"
 *   - exact IPv6        "2001:db8::1"  (string compare only, no prefix math)
 */
export function ipMatchesRange(ip: string, range: string): boolean {
  const entry = range.trim();
  if (!entry) return false;

  const slash = entry.indexOf("/");
  if (slash === -1) {
    return normalizeIp(entry) === ip;
  }

  const base = entry.slice(0, slash);
  const bits = Number(entry.slice(slash + 1));
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;

  const baseInt = ipv4ToInt(base);
  const ipInt = ipv4ToInt(ip);
  if (baseInt === null || ipInt === null) return false;

  // >>> 0 keeps the shift unsigned; a /0 mask must be 0, not -1.
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (baseInt & mask) === (ipInt & mask);
}

export function isIpAllowed(
  ip: string | null | undefined,
  ranges: string[] | null | undefined
): boolean {
  if (!ranges || ranges.length === 0) return true; // layer disabled
  const normalized = normalizeIp(ip);
  if (!normalized) return false; // cannot verify origin ⇒ treat as outside
  return ranges.some((r) => ipMatchesRange(normalized, r));
}

/** Validates one allow-list entry before it is saved by an admin. */
export function isValidIpRangeEntry(entry: string): boolean {
  const value = entry.trim();
  if (!value) return false;
  const slash = value.indexOf("/");
  if (slash === -1) {
    if (ipv4ToInt(value) !== null) return true;
    return /^[0-9a-f:]+$/i.test(value) && value.includes(":"); // loose IPv6
  }
  const bits = Number(value.slice(slash + 1));
  return (
    ipv4ToInt(value.slice(0, slash)) !== null &&
    Number.isInteger(bits) &&
    bits >= 0 &&
    bits <= 32
  );
}
