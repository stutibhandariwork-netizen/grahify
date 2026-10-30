import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { auth } from "@/auth";
import { BottomNav } from "@/components/nav";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const body = Manrope({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Grahify",
  description: "Your personal astrology, tarot and numerology companion.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#14111f" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const signedIn = !!(await auth())?.user;
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} min-h-dvh`}>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16">{children}</main>
        {signedIn && <BottomNav />}
        <footer className={`mx-auto max-w-2xl px-4 text-center text-xs text-muted ${signedIn ? "pb-28 sm:pb-10" : "pb-10"}`}>
          For reflection and entertainment. Place data ©{" "}
          <a className="underline" href="https://www.geonames.org/">
            GeoNames
          </a>{" "}
          (CC BY 4.0).
        </footer>
      </body>
    </html>
  );
}
