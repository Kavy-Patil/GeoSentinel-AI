import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Geo Sentinel 2.0 | Geospatial Intelligence",
  description: "AI-assisted satellite monitoring for land change and disaster response."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
