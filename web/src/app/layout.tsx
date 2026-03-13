import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: "ShadowTest | AI-Driven Behavioral UX Testing Infrastructure",
    template: "%s | ShadowTest"
  },
  description: "ShadowTest creates high-fidelity synthetic AI personas to stress-test your SaaS UX. Identify friction, interpretation errors, and conversion drop-offs with autonomous behavioral synthesis.",
  keywords: ["AI User Testing", "Behavioral Synthesis", "Synthetic Personas", "UX Research AI", "Automated UX Testing", "SaaS Optimization", "ShadowTest"],
  authors: [{ name: "ShadowTest Engineering" }],
  creator: "ShadowTest",
  publisher: "ShadowTest AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shadowtest.io",
    title: "ShadowTest - Neural Behavioral Testing",
    description: "Launch synthetic users to discover UX friction before your real users do.",
    siteName: "ShadowTest",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShadowTest | AI UX Testing",
    description: "Autonomous behavioral testing for modern SaaS.",
    creator: "@shadowtest_ai",
  },
};

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