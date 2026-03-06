import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ShadowTest - AI Behavioral Testing Infrastructure",
    template: "%s | ShadowTest"
  },
  description: "ShadowTest creates synthetic AI personas that interact with your SaaS product like real users. Discover UX friction, confusion points, and conversion drop-offs before launch.",
  keywords: ["AI User Testing", "Behavioral Testing", "Synthetic Persona", "UX Testing", "SaaS Analytics", "Developer Tools", "A/B Testing Alternative", "Automated QA"],
  authors: [{ name: "ShadowTest Team" }],
  creator: "ShadowTest",
  publisher: "ShadowTest Inc.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shadowtest.ai",
    title: "ShadowTest - Artificial User Testing for Modern SaaS",
    description: "Launch with confidence. Watch AI personas test your product, stumble on bad UX, and generate actionable behavioral insights.",
    siteName: "ShadowTest",
    images: [{
      url: "https://shadowtest.ai/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "ShadowTest Dashboard Preview"
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShadowTest - Test Your Product with AI Users",
    description: "Simulate human behavior before real users experience friction. UX insights delivered autonomously.",
    images: ["https://shadowtest.ai/twitter-image.jpg"],
    creator: "@shadowtest",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
