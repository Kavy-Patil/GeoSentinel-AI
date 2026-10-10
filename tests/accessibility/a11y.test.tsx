import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EvidenceUploadVerification from "../../components/EvidenceUploadVerification";
import SatelliteImage from "../../components/SatelliteImage";

describe("Accessibility (A11y) Verification Suite", () => {
  it("ensures all buttons have accessible names", () => {
    render(
      <EvidenceUploadVerification
        currentCategory="urban"
        recipients={[{ id: "1", email: "test@example.com", verified: true, consent: true, createdAt: "2026-10-10" }]}
      />
    );

    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toHaveAccessibleName();
      expect(btn.getAttribute("aria-hidden")).not.toBe("true");
    }
  });

  it("ensures form controls have accessible labels", () => {
    render(
      <EvidenceUploadVerification
        currentCategory="urban"
        recipients={[{ id: "1", email: "test@example.com", verified: true, consent: true, createdAt: "2026-10-10" }]}
      />
    );

    expect(screen.getByText("Incident Domain")).toBeInTheDocument();
    expect(screen.getByText("Reported Location / AOI")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("supports keyboard interaction on actionable satellite frames", () => {
    const onPoint = vi.fn();
    render(
      <SatelliteImage
        url="/imagery/pune_after.jpg"
        date="2024-03-25"
        title="After"
        place="Pune"
        center={[73.85, 18.52]}
        bounds={[73.7, 18.4, 73.9, 18.6]}
        points={[]}
        drawing={true}
        onPoint={onPoint}
      />
    );

    const interactiveFrame = screen.getByRole("button");
    expect(interactiveFrame).toHaveAttribute("tabIndex", "0");

    // Press Enter to place point via keyboard
    fireEvent.keyDown(interactiveFrame, { key: "Enter" });
    expect(onPoint).toHaveBeenCalledWith([73.85, 18.52]);
  });
});
