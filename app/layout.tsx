import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team Calendar",
  description: "Team availability calendar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}