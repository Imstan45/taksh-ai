import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Taksh AI — Placement preparation, personalized", template: "%s | Taksh AI" },
  description: "AI-powered placement preparation for engineering students.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
