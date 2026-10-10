# Geo Sentinel 2.0

Private city-and-state satellite comparison workspace. Search uses Open-Meteo/GeoNames, dated imagery uses NASA GIBS MODIS Terra true color, and the reference map uses OpenStreetMap.

## Implemented

- City/state lookup with disambiguation, timeout and no-results states.
- Two user-selected dates, validated before requesting imagery.
- Same geographic extent for both images, city marker and reference box.
- Manual review polygon, undo/clear and GeoJSON export.
- Responsive layout; before/after imagery is never hidden by a breakpoint.

## Limits

MODIS imagery is approximately 250 m, suitable for regional visual comparison, not individual building analysis. Clouds and missing coverage affect availability. GIBS WMS can snap to the nearest available date: displayed dates are requested dates, not independently verified acquisition times. The yellow box is a reference area, not a city boundary. Coral polygons are user annotations, not automatically detected impact. No damage, confidence, NDVI or area statistics are fabricated.

Open-Meteo's free endpoint is for non-commercial usage. Before commercial use, configure a licensed geocoding service. See https://open-meteo.com/en/docs/geocoding-api .

## Automated Testing & Quality Assurance

GeoSentinel AI includes a complete testing system covering unit, security, component, accessibility, and Playwright end-to-end tests:

```bash
# Run Unit, Security & Component Tests (Vitest)
pnpm test

# Run with full v8 Code Coverage Report
pnpm run test:coverage

# Run Playwright End-to-End User Journeys (Chrome)
pnpm run test:e2e

# Run Multi-phase Security & SMTP Integration Audit
pnpm run test:security
```

For complete architectural details, coverage breakdowns, and evaluator guidance, see [TESTING.md](TESTING.md).

## Production Build & Serving

Next.js is configured with `output: "export"` and writes static production assets to `out/`. Serve that directory with the integrated HTTP and SMTP server (`python server.py`) on port 8080:

```bash
pnpm run build
python server.py
```

## Publishing

Preserve the existing project ID in `.openai/hosting.json` and owner-only access. Use the Sites source workflow and fresh in-memory credentials. The Windows workflow requires Node, Git and Git Bash on PATH; GNU tar requires `TAR_OPTIONS=--force-local` for Windows archive paths. Do not commit credentials, node_modules, generated output or local caches.
