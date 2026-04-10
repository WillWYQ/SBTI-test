import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "SBTI Signal Archive",
  description: "An abstract Aceternity-inspired rebuild of the SBTI personality test, modified by willsleep.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInitScript = `
  (function () {
    var root = document.documentElement;
    var schemeQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
    var contrastQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-contrast: more)")
      : null;
    var theme = contrastQuery && contrastQuery.matches
      ? "contrast"
      : schemeQuery && schemeQuery.matches
        ? "night"
        : "day";

    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme === "day" ? "light" : "dark";
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable}`}
    >
      <body>
        <Script id="sbti-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
