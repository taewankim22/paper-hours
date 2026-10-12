import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/caveat/600.css";
import "@fontsource/caveat/700.css";
import "../style.css";

export const metadata: Metadata = {
  title: "Paper Hours — Study planner",
  description: "A little space for a focused day. An interactive 3D study notebook with live HTML pages.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <noscript>Enable JavaScript to open your interactive study notebook.</noscript>
      </body>
    </html>
  );
}
