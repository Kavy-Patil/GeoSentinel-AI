import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SatelliteImage, { EncroachmentSquare } from "../../components/SatelliteImage";

describe("SatelliteImage Component", () => {
  const defaultProps = {
    url: "/imagery/pune_after.jpg",
    date: "2024-03-25",
    title: "After",
    place: "Pune, Maharashtra, India",
    center: [73.8567, 18.5204] as [number, number],
    bounds: [73.72, 18.42, 73.99, 18.62] as [number, number, number, number],
    points: [],
    drawing: false,
    onPoint: vi.fn(),
    kmWidth: 40
  };

  it("renders image card with title, formatted date, and trim scale badge", () => {
    render(<SatelliteImage {...defaultProps} />);

    expect(screen.getByText("After")).toBeInTheDocument();
    expect(screen.getByText("Trimmed: 40 km")).toBeInTheDocument();
    expect(screen.getByAltText(/satellite imagery for Pune/i)).toBeInTheDocument();
  });

  it("renders encroachment squares with correct labels and percentages", () => {
    const squares: EncroachmentSquare[] = [
      { x: 62, y: 12, w: 34, h: 28, label: "Kharadi - Wagholi Corridor (+42.5% Acquired)" }
    ];

    render(<SatelliteImage {...defaultProps} squares={squares} />);
    expect(screen.getByText("Kharadi - Wagholi Corridor (+42.5% Acquired)")).toBeInTheDocument();
  });

  it("handles point placement during boundary drawing mode", () => {
    const onPoint = vi.fn();
    render(<SatelliteImage {...defaultProps} drawing={true} onPoint={onPoint} />);

    const frame = screen.getByRole("button");
    expect(frame).toBeInTheDocument();

    // Trigger click on frame
    fireEvent.click(frame, { clientX: 200, clientY: 150 });
    expect(onPoint).toHaveBeenCalled();
  });

  it("applies 3D perspective transform when view3d is enabled", () => {
    const { container } = render(<SatelliteImage {...defaultProps} view3d={true} />);
    const card = container.querySelector(".image-card.perspective-3d");
    expect(card).toBeInTheDocument();
  });
});
