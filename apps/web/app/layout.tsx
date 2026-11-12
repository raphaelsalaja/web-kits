import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { kits, site } from "@/lib/kits";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const names = new Intl.ListFormat("en-GB").format(kits.map((kit) => kit.name));
const description = `${site.description} ${names}.`;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#080808" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s › ${site.name}` },
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
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
