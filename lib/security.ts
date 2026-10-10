/**
 * GeoSentinel AI Security & Input Validation Utilities
 * Enforces XSS neutralization, jurisdiction/state/UT verification,
 * storage sanitization, and burst interaction abuse mitigation.
 */

export const VALID_INDIAN_STATES_AND_UTS = new Set([
  // 28 States
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // 8 Union Territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
]);

/**
 * Strips dangerous HTML tags and event handler injection strings.
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") {
    if (input === null || input === undefined) return "";
    return String(input);
  }
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control characters
    .trim();
}

/**
 * Validates whether a state or UT string matches an official Indian jurisdiction.
 */
export function isValidStateOrUT(stateOrUT: string): boolean {
  if (!stateOrUT || typeof stateOrUT !== "string") return false;
  const clean = sanitizeInput(stateOrUT).toLowerCase();
  for (const name of VALID_INDIAN_STATES_AND_UTS) {
    if (name.toLowerCase() === clean) return true;
  }
  // Also support common short aliases
  const aliases: Record<string, string> = {
    "ncr": "Delhi",
    "delhi ncr": "Delhi",
    "uk": "Uttarakhand",
    "up": "Uttar Pradesh",
    "mp": "Madhya Pradesh",
    "hp": "Himachal Pradesh",
    "wb": "West Bengal",
    "ap": "Andhra Pradesh",
    "tn": "Tamil Nadu"
  };
  return clean in aliases;
}

/**
 * Enforces length constraints for input fields.
 */
export function validateInputLength(
  value: string,
  minLen: number = 2,
  maxLen: number = 100
): { valid: boolean; error?: string } {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: "Input cannot be empty." };
  }
  const clean = sanitizeInput(value);
  if (clean.length < minLen) {
    return { valid: false, error: `Input must be at least ${minLen} characters.` };
  }
  if (clean.length > maxLen) {
    return { valid: false, error: `Input exceeds maximum limit of ${maxLen} characters.` };
  }
  return { valid: true };
}

/**
 * Abuse mitigation: Client-side sliding-window rate limiter for burst clicks.
 */
export class BurstRateLimiter {
  private timestamps: number[] = [];
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 5, windowMs: number = 2000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  public allowRequest(now: number = Date.now()): boolean {
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    if (this.timestamps.length >= this.limit) {
      return false; // Throttled
    }
    this.timestamps.push(now);
    return true;
  }

  public reset(): void {
    this.timestamps = [];
  }
}

/**
 * Ensures external links contain appropriate security rel attributes.
 */
export function getSafeLinkProps(href: string) {
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  return {
    href,
    target: isExternal ? "_blank" : undefined,
    rel: isExternal ? "noopener noreferrer" : undefined
  };
}

/**
 * Verifies that zero sensitive PII or credentials are leaked into web storage.
 */
export function verifyNoSensitiveStorage(storage: Storage): boolean {
  const sensitiveKeys = ["password", "token", "secret", "auth_pass", "app_password", "private_key"];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.some(s => keyLower.includes(s))) return false;
    const val = storage.getItem(key) || "";
    if (sensitiveKeys.some(s => val.toLowerCase().includes(s))) return false;
  }
  return true;
}
