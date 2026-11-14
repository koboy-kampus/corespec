import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono, IBM_Plex_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CommandPalette } from "@/components/layout/command-palette";
import { AccountSync } from "@/components/account/account-sync";
import { CatalogueOverlay } from "@/components/catalogue/catalogue-overlay";
import { loadCatalogue } from "@/lib/catalogue/load";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "CoreSpec",
  title: {
    default: "CoreSpec · Build your PC in 3D",
    template: "%s · CoreSpec",
  },
  description:
    "Pick parts, watch them snap into a 3D case, get live compatibility checks and prices in Rupiah.",
  keywords: [
    "PC builder",
    "rakit PC",
    "PC part picker Indonesia",
    "harga PC",
    "3D PC builder",
    "compatibility checker",
  ],
  openGraph: {
    type: "website",
    siteName: "CoreSpec",
    locale: "en_ID",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Cached (lib/catalogue/load.ts), so every page stays static. Null unless the
  // database has catalogue changes; then the browser gets only those.
  const { overlay } = await loadCatalogue();
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-btn bg-accent px-4 py-2 text-ui font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <CatalogueOverlay overlay={overlay}>
          <TooltipProvider>
            <Navbar />
            <main
              id="main"
              tabIndex={-1}
              className="flex flex-1 flex-col outline-none"
            >
              {children}
            </main>
            <Footer />
            <CommandPalette />
            <AccountSync />
          </TooltipProvider>
        </CatalogueOverlay>
        {/* Cookieless page-view counts. Vercel serves the script, so only render it there. */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
