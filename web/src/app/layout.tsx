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
    default: "ShadowTest - AI Behavioral Testing Infrastructure",
    template: "%s | ShadowTest"
  },
  description: "ShadowTest creates synthetic AI personas that interact with your SaaS product like real users. Discover UX friction, confusion points, and conversion drop-offs before launch.",
  keywords: ["AI User Testing", "Behavioral Testing", "Synthetic Persona", "UX Testing", "SaaS Analytics", "Developer Tools", "A/B Testing Alternative", "Automated QA"],
  authors: [{ name: "ShadowTest Team" }],
  creator: "ShadowTest",
  publisher: "ShadowTest Inc.",
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