import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { kits, site } from "@/lib/kits";
import "./globals.css";

const openRunde = localFont({
  src: [
    {
      path: "../fonts/open-runde/regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/open-runde/medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/open-runde/semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/open-runde/bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

const names = new Intl.ListFormat("en-GB").format(kits.map((kit) => kit.name));
const description = `${site.description} ${names}.`;

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.name,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: site.name,
    description,
    siteName: site.name,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={openRunde.variable}>
      <body>{children}</body>
    </html>
  );
}
