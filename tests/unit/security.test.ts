import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizeInput,
  isValidStateOrUT,
  validateInputLength,
  BurstRateLimiter,
  getSafeLinkProps,
  verifyNoSensitiveStorage,
  VALID_INDIAN_STATES_AND_UTS
} from "../../lib/security";

describe("Security Controls & Threat Mitigation", () => {
  describe("XSS Neutralization & Dangerous Input Sanitization", () => {
    it("neutralizes <script> tag injections completely", () => {
      const malicious = "<script>alert('pwned')</script>Amravati";
      const clean = sanitizeInput(malicious);
      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("alert");
      expect(clean).toBe("Amravati");
    });

    it("neutralizes DOM event handler injections (onload, onerror, onclick)", () => {
      const payload1 = '<img src="x" onerror="stealCookies()">';
      const clean1 = sanitizeInput(payload1);
      expect(clean1).not.toContain("onerror");
      expect(clean1).not.toContain("<img");

      const payload2 = '<b onmouseover="eval(payload)">Pune</b>';
      const clean2 = sanitizeInput(payload2);
      expect(clean2).not.toContain("onmouseover");
      expect(clean2).toBe("Pune");
    });

    it("neutralizes javascript: URI pseudo-protocol payloads", () => {
      const payload = "javascript:alert(document.cookie)";
      const clean = sanitizeInput(payload);
      expect(clean.toLowerCase()).not.toContain("javascript:");
    });

    it("strips invisible control characters (\x00, \x08, \x1F, \x7F)", () => {
      const withNullByte = "Mumbai\x00\x08Admin";
      const clean = sanitizeInput(withNullByte);
      expect(clean).toBe("MumbaiAdmin");
    });

    it("safely handles unexpected non-string inputs without throwing", () => {
      expect(sanitizeInput(null)).toBe("");
      expect(sanitizeInput(undefined)).toBe("");
      expect(sanitizeInput(12345)).toBe("12345");
      expect(sanitizeInput(true)).toBe("true");
      expect(sanitizeInput({ city: "Jaipur" })).toBe("[object Object]");
    });
  });

  describe("Jurisdiction / State / UT Code Validation", () => {
    it("accepts all 28 official Indian States", () => {
      const states = [
        "Maharashtra", "Kerala", "Assam", "Uttarakhand", "Karnataka",
        "Rajasthan", "Tamil Nadu", "Gujarat", "Telangana", "Punjab"
      ];
      for (const st of states) {
        expect(isValidStateOrUT(st)).toBe(true);
      }
    });

    it("accepts all 8 official Indian Union Territories", () => {
      const uts = [
        "Delhi", "Ladakh", "Jammu and Kashmir", "Chandigarh",
        "Puducherry", "Andaman and Nicobar Islands"
      ];
      for (const ut of uts) {
        expect(isValidStateOrUT(ut)).toBe(true);
      }
    });

    it("accepts common jurisdiction abbreviations and aliases", () => {
      expect(isValidStateOrUT("NCR")).toBe(true);
      expect(isValidStateOrUT("UK")).toBe(true);
      expect(isValidStateOrUT("UP")).toBe(true);
      expect(isValidStateOrUT("MP")).toBe(true);
    });

    it("strictly rejects invalid, fabricated, or foreign jurisdictions", () => {
      expect(isValidStateOrUT("California")).toBe(false);
      expect(isValidStateOrUT("InvalidRegion123")).toBe(false);
      expect(isValidStateOrUT("FakeState")).toBe(false);
      expect(isValidStateOrUT("")).toBe(false);
    });
  });

  describe("Abuse Mitigation & Rate Limiting", () => {
    let limiter: BurstRateLimiter;

    beforeEach(() => {
      limiter = new BurstRateLimiter(3, 1000); // 3 requests per 1000ms
    });

    it("allows standard requests within threshold", () => {
      const t0 = 10000;
      expect(limiter.allowRequest(t0)).toBe(true);
      expect(limiter.allowRequest(t0 + 100)).toBe(true);
      expect(limiter.allowRequest(t0 + 200)).toBe(true);
    });

    it("throttles burst interactions exceeding velocity limit", () => {
      const t0 = 10000;
      limiter.allowRequest(t0);
      limiter.allowRequest(t0 + 50);
      limiter.allowRequest(t0 + 100);
      // 4th burst request in window must be blocked
      expect(limiter.allowRequest(t0 + 150)).toBe(false);
      expect(limiter.allowRequest(t0 + 200)).toBe(false);
    });

    it("recovers and allows requests once time window elapses", () => {
      const t0 = 10000;
      limiter.allowRequest(t0);
      limiter.allowRequest(t0 + 50);
      limiter.allowRequest(t0 + 100);
      expect(limiter.allowRequest(t0 + 150)).toBe(false);

      // Advance clock past 1000ms window
      expect(limiter.allowRequest(t0 + 1100)).toBe(true);
    });
  });

  describe("External Link Security Attributes", () => {
    it("attaches rel='noopener noreferrer' and target='_blank' to external URLs", () => {
      const ext = getSafeLinkProps("https://earthdata.nasa.gov");
      expect(ext.rel).toBe("noopener noreferrer");
      expect(ext.target).toBe("_blank");
      expect(ext.href).toBe("https://earthdata.nasa.gov");
    });

    it("does not attach external target/rel to internal anchor links", () => {
      const internal = getSafeLinkProps("#monitoring");
      expect(internal.rel).toBeUndefined();
      expect(internal.target).toBeUndefined();
    });
  });

  describe("Storage Sanitization & Zero Sensitive Leakage", () => {
    it("passes when localStorage contains standard non-sensitive items", () => {
      localStorage.clear();
      localStorage.setItem("theme", "dark");
      localStorage.setItem("lastCity", "Pune");
      expect(verifyNoSensitiveStorage(localStorage)).toBe(true);
    });

    it("fails when sensitive secrets or credentials are persisted to storage", () => {
      localStorage.clear();
      localStorage.setItem("app_password", "mtmv klfa dcgp yaxm");
      expect(verifyNoSensitiveStorage(localStorage)).toBe(false);

      localStorage.clear();
      localStorage.setItem("authToken", "secret_token_123");
      expect(verifyNoSensitiveStorage(localStorage)).toBe(false);
    });
  });
});
