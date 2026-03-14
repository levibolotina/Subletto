import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/layout/navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://subletto.co";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Subletto | CU Boulder Student Subleases",
    template: "%s | Subletto",
  },
  description:
    "The only verified sublease marketplace for CU Boulder students. Scam-free subleases with ID-verified listers, secure payments, and legal agreements.",
  keywords: [
    "CU Boulder sublease",
    "Boulder sublease summer",
    "CU Boulder sublet",
    "CU Boulder housing",
    "Boulder CO sublease",
    "University of Colorado sublease",
  ],
  openGraph: {
    title: "Subletto | CU Boulder Student Subleases",
    description:
      "Verified, scam-free subleases exclusively for CU Boulder students. Secure payments, ID-verified listers.",
    url: APP_URL,
    siteName: "Subletto",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Subletto | CU Boulder Student Subleases",
    description:
      "Verified, scam-free subleases exclusively for CU Boulder students.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: APP_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${playfairDisplay.variable}`}>
        <body className="min-h-screen bg-white font-sans antialiased">
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
