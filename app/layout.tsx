import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AquaScan — Aquarium Intelligence",
  description: "Scan aquarium plants, fish, driftwood & substrate. Design your dream tank with AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: "#040d14" }}>{children}</body>
    </html>
  );
}
