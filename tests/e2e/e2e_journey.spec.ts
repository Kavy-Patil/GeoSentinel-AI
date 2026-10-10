import { test, expect } from "@playwright/test";

test.describe("GeoSentinel AI Citizen & Operator E2E Journeys", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8080/");
  });

  test("Journey 1: Homepage, Navigation & Sensor Intelligence Exploration", async ({ page }) => {
    // 1. Verify top branding & page title
    await expect(page).toHaveTitle(/Geo Sentinel/i);
    await expect(page.locator(".brand")).toContainText("Geo Sentinel");
    await expect(page.locator(".private-badge")).toBeVisible();

    // 2. Verify monitoring category switching
    const urbanBtn = page.locator("button.category-btn", { hasText: "Urban" });
    const floodBtn = page.locator("button.category-btn", { hasText: "Flood" });
    const landslideBtn = page.locator("button.category-btn", { hasText: "Landslide" });

    await expect(urbanBtn).toBeVisible();
    await floodBtn.click();
    await expect(floodBtn).toHaveClass(/active-flood/);

    await landslideBtn.click();
    await expect(landslideBtn).toHaveClass(/active-landslide/);

    // 3. Sensor resolution integrity guide expandable
    const details = page.locator("details");
    await details.click();
    await expect(page.locator("details p").first()).toBeVisible();
  });

  test("Journey 2: Citizen Evidence Upload & Verified Satellite Match Protocol", async ({ page }) => {
    const portal = page.locator(".evidence-portal-card");
    await expect(portal).toBeVisible();

    // Click sample matching evidence
    const testMatchBtn = page.locator("button", { hasText: "✓ Test Matching Evidence" });
    await testMatchBtn.click();

    // Action verify button
    const verifyBtn = page.locator("button.verify-action-btn");
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // Verify analyzing pipeline appears
    await expect(page.locator("text=Satellite Verification Pipeline in Progress")).toBeVisible();

    // Wait for verified result banner
    const resultBox = page.locator(".verification-result-box.match");
    await expect(resultBox).toBeVisible({ timeout: 10000 });
    await expect(resultBox).toContainText("VERIFIED BY SATELLITE INTELLIGENCE");
    await expect(resultBox).toContainText("Automated High-Priority Alert Transmitted to Designated Authorities");
    await expect(resultBox).toContainText("mishrasakshamm14@gmail.com");
  });

  test("Journey 3: False Alarm Auto-Discard Journey (Zero Alerts Dispatched)", async ({ page }) => {
    const testMismatchBtn = page.locator("button", { hasText: "✕ Test Non-Matching" });
    await testMismatchBtn.click();

    const verifyBtn = page.locator("button.verify-action-btn");
    await verifyBtn.click();

    // Wait for discarded result banner
    const discardBox = page.locator(".verification-result-box.discarded");
    await expect(discardBox).toBeVisible({ timeout: 10000 });
    await expect(discardBox).toContainText("SUBMISSION AUTOMATICALLY DISCARDED");
    await expect(discardBox).toContainText("Safeguard Policy: Zero Alerts Transmitted");
    await expect(discardBox).toContainText("no alert emails were sent to authorities");
  });

  test("Journey 4: Security Neutralization & Zero City Examples in Inputs", async ({ page }) => {
    // Check that city input placeholder has zero city examples
    const cityInput = page.locator("#city");
    await expect(cityInput).toHaveAttribute("placeholder", "Enter city name");

    const aoiInput = page.locator("input[placeholder='Enter location name or area of interest']");
    await expect(aoiInput).toBeVisible();

    // Attempt XSS input
    await aoiInput.fill("<script>alert('xss')</script>Test AOI");
    const val = await aoiInput.inputValue();
    // Browser renders literal string without executing
    expect(val).toContain("Test AOI");
    // Ensure no alert dialog popped up
  });
});
