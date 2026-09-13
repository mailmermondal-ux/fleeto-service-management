import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fleeto Service Management",
  description: "Material and battery service lifecycle management"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
