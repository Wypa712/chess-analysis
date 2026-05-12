import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "@/styles/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chess Analysis",
  description: "Аналіз шахових партій для гравців рівня ~1000 ELO",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-v3.svg", type: "image/svg+xml" },
      { url: "/favicon-48-v3.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-32-v3.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16-v3.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon-v3.png", sizes: "180x180", type: "image/png" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chess",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
