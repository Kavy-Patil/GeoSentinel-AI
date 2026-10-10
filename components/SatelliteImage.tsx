"use client";
import { useEffect, useState } from "react";
import { Bounds, Point, fromPercent, toPercent } from "../lib/geo";

export type EncroachmentSquare = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};

type Props = {
  url: string;
  date: string;
  title: string;
  place: string;
  center: Point;
  bounds: Bounds;
  points: Point[];
  drawing: boolean;
  onPoint: (point: Point) => void;
  categoryColor?: string;
  view3d?: boolean;
  squares?: EncroachmentSquare[];
  footerLabel?: string;
  kmWidth?: number;
};

export default function SatelliteImage({
  url,
  date,
  title,
  place,
  center,
  bounds,
  points,
  drawing,
  onPoint,
  categoryColor = "#ff7152",
  view3d = false,
  squares,
  footerLabel,
  kmWidth = 80
}: Props) {
  const [status, setStatus] = useState<"loading" | "loaded" | "empty" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus("loading");
    if (url.startsWith("/imagery/")) {
      setStatus("loaded");
      return;
    }
    const timer = setTimeout(() => setStatus(s => s === "loading" ? "error" : s), 45000);
    return () => clearTimeout(timer);
  }, [url, attempt]);

  const marker = toPercent(center, bounds);
  const vertices = points.map(p => toPercent(p, bounds));
  const polyFill = `${categoryColor}33`;

  // Trim factor based on km size: baseline is 80 km.
  // E.g. 40 km trims the view to 2x zoom into the center urban core;
  // 20 km trims the view to 4x zoom;
  // 160 km expands to 0.75x overview.
  const zoomFactor = kmWidth ? Math.min(4.0, Math.max(0.7, 80 / kmWidth)) : 1;

  return (
    <article className={`image-card ${view3d ? "perspective-3d" : ""}`}>
      <header>
        <div>
          <span className="eyebrow">{title}</span>
          <h3>
            {new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC"
            })}
          </h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {kmWidth && (
            <span className="trimmed-badge">
              {kmWidth < 80 ? `Trimmed: ${kmWidth} km` : `${kmWidth} km`}
            </span>
          )}
          <span className={`image-status ${status}`}>
            {status === "loaded" ? "Loaded" : status === "loading" ? "Loading…" : status === "empty" ? "No coverage" : "Error"}
          </span>
        </div>
      </header>

      <div
        className={`satellite-frame ${drawing && status === "loaded" ? "drawing" : ""} ${view3d ? "terrain-3d" : ""}`}
        style={{
          position: "relative",
          aspectRatio: "4/3",
          background: "#172b33",
          overflow: "hidden",
          ...(view3d ? { transform: "perspective(900px) rotateX(24deg) scale(0.96)", transition: "all 0.4s ease" } : {})
        }}
        role={drawing ? "button" : undefined}
        tabIndex={drawing ? 0 : undefined}
        aria-label={`${title} satellite image: trimmed to ${kmWidth} km extent`}
        onKeyDown={e => { if (drawing && status === "loaded" && e.key === "Enter") onPoint(center); }}
        onClick={e => {
          if (!drawing || status !== "loaded") return;
          const rect = e.currentTarget.getBoundingClientRect();
          const rawPctX = ((e.clientX - rect.left) / rect.width) * 100;
          const rawPctY = ((e.clientY - rect.top) / rect.height) * 100;
          const unscaledX = marker[0] + (rawPctX - marker[0]) / zoomFactor;
          const unscaledY = marker[1] + (rawPctY - marker[1]) / zoomFactor;
          onPoint(fromPercent(Math.max(0, Math.min(100, unscaledX)), Math.max(0, Math.min(100, unscaledY)), bounds));
        }}
      >
        <div
          className="satellite-viewport-scaler"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            transformOrigin: `${marker[0]}% ${marker[1]}%`,
            transform: `scale(${zoomFactor})`,
            transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          <img
            key={`${url}:${attempt}`}
            src={url}
            crossOrigin={url.startsWith("http") ? "anonymous" : undefined}
            alt={`${title}: satellite imagery for ${place} on ${date}`}
            style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }}
            onError={() => setStatus("error")}
            onLoad={e => {
              if (url.startsWith("/imagery/")) {
                setStatus("loaded");
                return;
              }
              try {
                const canvas = document.createElement("canvas");
                canvas.width = 32;
                canvas.height = 24;
                const ctx = canvas.getContext("2d");
                if (!ctx) { setStatus("loaded"); return; }
                ctx.drawImage(e.currentTarget, 0, 0, 32, 24);
                const data = ctx.getImageData(0, 0, 32, 24).data;
                let visible = 0;
                for (let i = 0; i < data.length; i += 4) {
                  if (data[i + 3] > 20 && data[i] + data[i + 1] + data[i + 2] > 15) visible++;
                }
                setStatus(visible < 5 ? "empty" : "loaded");
              } catch {
                setStatus("loaded");
              }
            }}
          />

          {status === "loaded" && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="City marker and review area" className="image-markings">
              <rect x="34" y="34" width="32" height="32" fill="none" stroke="#ffdd77" strokeWidth="0.4" strokeDasharray="1.4 1" />
              <circle cx={marker[0]} cy={marker[1]} r="1.1" fill="#ffdd77" stroke="#122e3e" strokeWidth="0.35" />

              {/* Squares for Urban Encroachment */}
              {squares && squares.map((sq, i) => (
                <g key={`sq-${i}`} className="encroachment-square">
                  <rect
                    x={sq.x}
                    y={sq.y}
                    width={sq.w}
                    height={sq.h}
                    fill="rgba(239, 68, 68, 0.22)"
                    stroke="#ef4444"
                    strokeWidth="0.9"
                    strokeDasharray="2.5 1.2"
                  />
                  <rect
                    x={sq.x}
                    y={Math.max(0, sq.y - 4.5)}
                    width={Math.min(sq.w, 54)}
                    height={4.2}
                    fill="#ef4444"
                    rx="0.5"
                  />
                  <text
                    x={sq.x + 1}
                    y={Math.max(3, sq.y - 1.2)}
                    fill="white"
                    fontSize="2.4"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {sq.label}
                  </text>
                </g>
              ))}

              {vertices.length >= 3 && <polygon points={vertices.map(p => p.join(",")).join(" ")} fill={polyFill} stroke={categoryColor} strokeWidth="0.6" />}
              {vertices.length === 2 && <polyline points={vertices.map(p => p.join(",")).join(" ")} fill="none" stroke={categoryColor} strokeWidth="0.6" />}
              {vertices.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="0.7" fill={categoryColor} stroke="white" strokeWidth="0.18" />)}
            </svg>
          )}
        </div>

        {status !== "loaded" && (
          <div className="image-message" role="status">
            <b>{status === "loading" ? "Fetching satellite imagery" : status === "empty" ? "No visible imagery for this view" : "Imagery could not be loaded"}</b>
            <p>{status === "loading" ? "Loading imagery from data provider." : "Try another date or check network availability."}</p>
            {status !== "loading" && <button type="button" onClick={e => { e.stopPropagation(); setAttempt(a => a + 1); }}>Retry image</button>}
          </div>
        )}
        <span className="north">N ↑</span>
      </div>

      <footer>
        <span>{footerLabel || "NASA GIBS · Terra / MODIS"}</span>
        {url.startsWith("http") ? (
          <a href={url} target="_blank" rel="noreferrer">Open source image ↗</a>
        ) : (
          <span style={{ color: "#0f766e", fontWeight: 700, fontSize: "10px" }}>
            High-Res Satellite Observation · {kmWidth} km Trim
          </span>
        )}
      </footer>
    </article>
  );
}
