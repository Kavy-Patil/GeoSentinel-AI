import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EvidenceUploadVerification from "../../components/EvidenceUploadVerification";
import type { Recipient } from "../../lib/geoguard/types";

const mockRecipients: Recipient[] = [
  { id: "1", email: "mishrasakshamm14@gmail.com", verified: true, consent: true, createdAt: "2026-10-10" },
  { id: "2", email: "shettysoumya20032@gmail.com", verified: true, consent: true, createdAt: "2026-10-10" },
  { id: "3", email: "jeeapriltest@gmail.com", verified: true, consent: true, createdAt: "2026-10-10" }
];

describe("EvidenceUploadVerification Component", () => {
  it("renders the evidence verification portal heading and description", () => {
    render(
      <EvidenceUploadVerification
        currentCategory="urban"
        recipients={mockRecipients}
      />
    );

    expect(screen.getByText(/INTELLIGENT EVIDENCE CROSS-VERIFICATION/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Ground Evidence & Satellite AI Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/SMTP Dispatch Relay/i)).toBeInTheDocument();
  });

  it("strictly enforces zero city examples in input placeholders", () => {
    render(
      <EvidenceUploadVerification
        currentCategory="urban"
        recipients={mockRecipients}
      />
    );

    const input = screen.getByPlaceholderText("Enter location name or area of interest");
    expect(input).toBeInTheDocument();
    expect(input.getAttribute("placeholder")).not.toMatch(/pune|amravati|delhi|jaipur|e\.g\./i);
  });

  it("allows switching incident categories (urban, flood, landslide)", () => {
    render(
      <EvidenceUploadVerification
        currentCategory="urban"
        recipients={mockRecipients}
      />
    );

    const select = screen.getByDisplayValue("Illegal Urban Encroachment");
    fireEvent.change(select, { target: { value: "flood" } });
    expect(screen.getByDisplayValue("Flood Inundation & Overflow")).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "landslide" } });
    expect(screen.getByDisplayValue("Landslide & Slope Collapse")).toBeInTheDocument();
  });

  it("handles the matching evidence workflow and confirms authority alert dispatch", async () => {
    const onAlertDispatched = vi.fn();
    render(
      <EvidenceUploadVerification
        currentCategory="urban"
        recipients={mockRecipients}
        onAlertDispatched={onAlertDispatched}
      />
    );

    // 1. Click sample matching evidence button
    const testMatchBtn = screen.getByText(/✓ Test Matching Evidence/i);
    fireEvent.click(testMatchBtn);

    expect(screen.getByText(/ground_illegal_construction_photo\.jpg/i)).toBeInTheDocument();

    // 2. Click verify action button
    const verifyBtn = screen.getByText(/🔍 Verify Evidence against Satellite Data/i);
    fireEvent.click(verifyBtn);

    // 3. Verify analyzing pipeline appears
    expect(screen.getByText(/Satellite Verification Pipeline in Progress/i)).toBeInTheDocument();

    // 4. Wait for match outcome
    await waitFor(
      () => {
        expect(screen.getByText(/VERIFIED BY SATELLITE INTELLIGENCE/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    expect(screen.getByText(/Ground Evidence Confirmed by Satellite Ground Observation/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated High-Priority Alert Transmitted to Designated Authorities/i)).toBeInTheDocument();

    // Authority recipients listed
    expect(screen.getAllByText(/mishrasakshamm14@gmail.com/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/shettysoumya20032@gmail.com/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/jeeapriltest@gmail.com/i).length).toBeGreaterThan(0);

    expect(onAlertDispatched).toHaveBeenCalled();
  }, 15000);

  it("handles the non-matching evidence workflow with automatic discard and zero alerts", async () => {
    const onAlertDispatched = vi.fn();
    render(
      <EvidenceUploadVerification
        currentCategory="urban"
        recipients={mockRecipients}
        onAlertDispatched={onAlertDispatched}
      />
    );

    // 1. Click sample non-matching button
    const testMismatchBtn = screen.getByText(/✕ Test Non-Matching/i);
    fireEvent.click(testMismatchBtn);

    expect(screen.getByText(/unrelated_offsite_photo_test\.jpg/i)).toBeInTheDocument();

    // 2. Click verify action button
    const verifyBtn = screen.getByText(/🔍 Verify Evidence against Satellite Data/i);
    fireEvent.click(verifyBtn);

    // 3. Wait for discard outcome
    await waitFor(
      () => {
        expect(screen.getAllByText(/SUBMISSION AUTOMATICALLY DISCARDED/i).length).toBeGreaterThan(0);
      },
      { timeout: 8000 }
    );

    expect(screen.getByText(/Satellite Cross-Verification Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Safeguard Policy: Zero Alerts Transmitted/i)).toBeInTheDocument();
    expect(screen.getByText(/no alert emails were sent to authorities/i)).toBeInTheDocument();

    // Zero alerts sent callback
    expect(onAlertDispatched).not.toHaveBeenCalled();
  }, 15000);

  it("clears evidence state when user clicks Remove", () => {
    render(
      <EvidenceUploadVerification
        currentCategory="urban"
        recipients={mockRecipients}
      />
    );

    const testMatchBtn = screen.getByText(/✓ Test Matching Evidence/i);
    fireEvent.click(testMatchBtn);
    expect(screen.getByText(/ground_illegal_construction_photo\.jpg/i)).toBeInTheDocument();

    const removeBtn = screen.getByText(/✕ Remove/i);
    fireEvent.click(removeBtn);

    expect(screen.queryByText(/ground_illegal_construction_photo\.jpg/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Click to select or drag & drop evidence image/i)).toBeInTheDocument();
  });
});
