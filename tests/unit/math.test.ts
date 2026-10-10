import { describe, it, expect } from "vitest";
import {
  closedRing,
  polygonAreaM2,
  m2ToHectares,
  m2ToKm2,
  yearsBetween,
  deltaArea,
  percentChange,
  annualizedGrowthPct,
  ndvi,
  ndwi,
  slopeDeg,
  summarizeMath
} from "../../lib/geoguard/math";
import type { LonLat } from "../../lib/geoguard/types";

describe("Geospatial & Remote Sensing Mathematical Engine", () => {
  describe("Polygon Closure & Spherical Area", () => {
    it("closes open coordinate rings by appending the first vertex", () => {
      const open: LonLat[] = [[73.8, 18.5], [73.9, 18.5], [73.9, 18.6]];
      const closed = closedRing(open);
      expect(closed.length).toBe(4);
      expect(closed[3]).toEqual(open[0]);
    });

    it("preserves rings that are already closed", () => {
      const alreadyClosed: LonLat[] = [[73.8, 18.5], [73.9, 18.5], [73.9, 18.6], [73.8, 18.5]];
      const result = closedRing(alreadyClosed);
      expect(result.length).toBe(4);
    });

    it("returns empty array for empty ring input", () => {
      expect(closedRing([])).toEqual([]);
    });

    it("requires at least 3 distinct vertices for area calculation", () => {
      expect(polygonAreaM2([])).toBeNull();
      expect(polygonAreaM2([[73.8, 18.5], [73.9, 18.5]])).toBeNull();
    });

    it("computes accurate spherical area for known geographic polygon", () => {
      // 0.1 deg x 0.1 deg box near equator (~11.1 km x ~11.1 km ≈ 123 km² ≈ 1.23e8 m²)
      const polygon: LonLat[] = [
        [0.0, 0.0],
        [0.1, 0.0],
        [0.1, 0.1],
        [0.0, 0.1]
      ];
      const area = polygonAreaM2(polygon);
      expect(area).not.toBeNull();
      expect(area!).toBeGreaterThan(1.2e8);
      expect(area!).toBeLessThan(1.25e8);
    });

    it("converts square metres to hectares and square kilometres accurately", () => {
      expect(m2ToHectares(10000)).toBe(1);
      expect(m2ToHectares(50000)).toBe(5);
      expect(m2ToKm2(1_000_000)).toBe(1);
      expect(m2ToKm2(24_200_000)).toBe(24.2);
    });
  });

  describe("Temporal Interval & Change Analysis", () => {
    it("computes fractional years between two ISO dates", () => {
      const years = yearsBetween("2014-04-12", "2024-04-12");
      expect(years).not.toBeNull();
      expect(Math.round(years!)).toBe(10);
    });

    it("safely returns null when dates are inverted or invalid", () => {
      expect(yearsBetween("2024-04-12", "2014-04-12")).toBeNull();
      expect(yearsBetween("not-a-date", "2024-04-12")).toBeNull();
    });

    it("calculates delta area and percentage change correctly", () => {
      expect(deltaArea(150, 100)).toBe(50);
      expect(deltaArea(null, 100)).toBeNull();

      expect(percentChange(50, 100)).toBe(50);
      expect(percentChange(null, 100)).toBeNull();
      expect(percentChange(50, 0)).toBeNull(); // Division by zero protection
    });

    it("computes annualized compound expansion rate", () => {
      // 100 to 200 over 10 years => (2^(0.1) - 1) * 100 ≈ 7.18%
      const rate = annualizedGrowthPct(200, 100, 10);
      expect(rate).not.toBeNull();
      expect(rate!).toBeCloseTo(7.18, 1);
    });

    it("protects against non-positive numbers in compound growth calculation", () => {
      expect(annualizedGrowthPct(100, 0, 5)).toBeNull();
      expect(annualizedGrowthPct(-50, 100, 5)).toBeNull();
      expect(annualizedGrowthPct(100, 50, 0)).toBeNull();
      expect(annualizedGrowthPct(100, 50, -2)).toBeNull();
    });
  });

  describe("Multispectral Indices (NDVI & NDWI)", () => {
    it("calculates NDVI = (NIR - Red) / (NIR + Red)", () => {
      expect(ndvi(0.6, 0.2)).toBeCloseTo(0.5, 4);
      expect(ndvi(0.8, 0.1)).toBeCloseTo(0.7778, 3);
    });

    it("returns null on zero denominator without throwing ZeroDivisionError", () => {
      expect(ndvi(0, 0)).toBeNull();
      expect(ndvi(null, 0.2)).toBeNull();
      expect(ndvi(0.4, null)).toBeNull();
    });

    it("calculates NDWI = (Green - NIR) / (Green + NIR)", () => {
      expect(ndwi(0.5, 0.1)).toBeCloseTo(0.6667, 3);
      expect(ndwi(0, 0)).toBeNull();
      expect(ndwi(null, 0.1)).toBeNull();
    });
  });

  describe("Terrain Slope Analysis", () => {
    it("computes slope in degrees from orthogonal finite differences", () => {
      // 45 degree slope: dz/dx = 1, dz/dy = 0 => atan(1) = 45 deg
      expect(slopeDeg(1.0, 0.0)).toBeCloseTo(45.0, 1);
      // Flat terrain: dz/dx = 0, dz/dy = 0 => 0 deg
      expect(slopeDeg(0.0, 0.0)).toBeCloseTo(0.0, 1);
    });
  });

  describe("Comprehensive Analytical Synthesis (summarizeMath)", () => {
    it("synthesizes full analytical metrics and records proper assumptions", () => {
      const summary = summarizeMath({
        beforeAreaM2: 100_000_000,
        afterAreaM2: 174_500_000,
        beforeDate: "2014-03-20",
        afterDate: "2024-03-25",
        nir: 0.42,
        red: 0.18,
        green: 0.22,
        meanSlopeDeg: 14.2,
        precipMm: null,
        floodedAreaM2: null,
        aoiAreaM2: 250_000_000
      });

      expect(summary.deltaAreaM2).toBe(74_500_000);
      expect(summary.percentChange).toBeCloseTo(74.5, 1);
      expect(summary.ndvi).toBeCloseTo((0.42 - 0.18) / (0.42 + 0.18), 3);
      expect(summary.ndwi).toBeCloseTo((0.22 - 0.42) / (0.22 + 0.42), 3);
      expect(summary.slopeDeg).toBe(14.2);
      expect(summary.assumptions).toContain("Flooded area is omitted because SAR/optical water classification has not been produced for this AOI.");
    });
  });
});
