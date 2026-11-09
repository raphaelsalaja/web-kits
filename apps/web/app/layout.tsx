import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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

const title = "Web Kits";
const description = "Interface kits for the web.";

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: {
    default: title,
    template: `%s — ${title}`,
  },
  description,
  openGraph: {
    title,
    description,
    siteName: title,
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
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
