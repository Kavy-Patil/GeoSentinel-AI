import { describe, it, expect } from "vitest";
import { dateError, boundsFor, label, validPlaces, EARLIEST_DATE } from "../../lib/geo";
import { validateInputLength } from "../../lib/security";

describe("Input Validation & Geo Utilities", () => {
  describe("Text & Length Validation", () => {
    it("accepts valid input within range", () => {
      const res = validateInputLength("Pune", 2, 100);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("rejects empty or whitespace-only input", () => {
      const emptyRes = validateInputLength("", 2, 100);
      expect(emptyRes.valid).toBe(false);
      expect(emptyRes.error).toContain("empty");

      const wsRes = validateInputLength("   ", 2, 100);
      expect(wsRes.valid).toBe(false);
    });

    it("rejects input shorter than minimum boundary", () => {
      const shortRes = validateInputLength("A", 2, 100);
      expect(shortRes.valid).toBe(false);
      expect(shortRes.error).toContain("at least 2 characters");
    });

    it("accepts input at exact boundary values", () => {
      const minBound = validateInputLength("AB", 2, 100);
      expect(minBound.valid).toBe(true);

      const max100 = "A".repeat(100);
      const maxBound = validateInputLength(max100, 2, 100);
      expect(maxBound.valid).toBe(true);
    });

    it("rejects input exceeding maximum boundary", () => {
      const over100 = "A".repeat(101);
      const overRes = validateInputLength(over100, 2, 100);
      expect(overRes.valid).toBe(false);
      expect(overRes.error).toContain("exceeds maximum limit");
    });
  });

  describe("Date Validation (dateError)", () => {
    const today = "2026-10-10";

    it("accepts valid chronological dates within satellite observation window", () => {
      expect(dateError("2014-04-12", "2024-04-28", today)).toBe("");
      expect(dateError("2000-03-01", "2025-01-01", today)).toBe("");
    });

    it("rejects invalid date formats", () => {
      expect(dateError("2024/02/14", "2025-02-19", today)).toContain("valid before and after dates");
      expect(dateError("invalid", "2025-02-19", today)).toContain("valid before and after dates");
      expect(dateError("2024-02-31", "2025-02-19", today)).toContain("valid before and after dates"); // invalid leap date
    });

    it("rejects dates before MODIS EARLIEST_DATE (2000-02-24)", () => {
      expect(dateError("1999-12-31", "2010-01-01", today)).toContain("MODIS imagery starts on 24 February 2000");
    });

    it("rejects equal or reversed dates (before >= after)", () => {
      expect(dateError("2024-05-10", "2024-05-10", today)).toContain("later than the before date");
      expect(dateError("2024-05-10", "2020-05-10", today)).toContain("later than the before date");
    });

    it("rejects future dates beyond today", () => {
      expect(dateError("2024-01-01", "2027-01-01", today)).toContain("Future satellite imagery is not available");
    });
  });

  describe("Geographic Bounding Box Generation (boundsFor)", () => {
    const place = { id: 1, name: "Amravati", latitude: 20.9374, longitude: 77.7796 };

    it("generates correct bounding box for default 80 km width", () => {
      const [west, south, east, north] = boundsFor(place, 80);
      expect(west).toBeLessThan(place.longitude);
      expect(east).toBeGreaterThan(place.longitude);
      expect(south).toBeLessThan(place.latitude);
      expect(north).toBeGreaterThan(place.latitude);
    });

    it("clamps boundaries to valid spherical coordinates [-180..180, -85..85]", () => {
      const polePlace = { id: 2, name: "North Pole", latitude: 84.5, longitude: 179.5 };
      const [west, south, east, north] = boundsFor(polePlace, 160);
      expect(north).toBeLessThanOrEqual(85);
      expect(south).toBeGreaterThanOrEqual(-85);
      expect(east).toBeLessThanOrEqual(180);
      expect(west).toBeGreaterThanOrEqual(-180);
    });

    it("correctly scales width between core trim (20km) and regional (160km)", () => {
      const bounds20 = boundsFor(place, 20);
      const bounds160 = boundsFor(place, 160);
      const width20 = bounds20[2] - bounds20[0];
      const width160 = bounds160[2] - bounds160[0];
      expect(width160).toBeGreaterThan(width20);
    });
  });

  describe("Location Labeling & Sanitization", () => {
    it("deduplicates redundant location segments in label", () => {
      expect(label({ id: 1, name: "Pune", admin1: "Maharashtra", country: "India", latitude: 18.5, longitude: 73.8 }))
        .toBe("Pune, Maharashtra, India");

      // Duplicate names handled
      expect(label({ id: 2, name: "Delhi", admin1: "Delhi", country: "India", latitude: 28.6, longitude: 77.2 }))
        .toBe("Delhi, India");
    });

    it("filters invalid places from API responses (validPlaces)", () => {
      const rawApi = [
        { id: 101, name: "Amravati", latitude: 20.93, longitude: 77.78, feature_code: "PPLA" },
        { id: "invalid-id", name: "Bad" }, // invalid id
        null, // null entry
        { id: 102, name: "Ghost City", latitude: 190.0, longitude: 50.0 }, // invalid lat > 85
        { id: 103, name: 12345, latitude: 20.0, longitude: 70.0 }, // invalid name type
        { id: 104, name: "Valid Town", latitude: 18.5, longitude: 73.8, feature_code: "PPL" }
      ];

      const sanitized = validPlaces(rawApi);
      expect(sanitized.length).toBe(2);
      expect(sanitized[0].name).toBe("Amravati");
      expect(sanitized[1].name).toBe("Valid Town");
    });
  });
});
