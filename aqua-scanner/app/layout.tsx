import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AquaScan — Aquarium Intelligence Scanner",
  description: "Scan aquarium plants, fish, driftwood, and substrate to get instant expert insights about suitability, CO2 needs, care requirements, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
