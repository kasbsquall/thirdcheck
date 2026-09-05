import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThirdCheck — Attestcoin binding audit",
  description:
    "The Attestcoin precompile proves inclusion and continuity. Everything else is the third check. ThirdCheck falsifies it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
