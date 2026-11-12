import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nyeri Content Creators of the Year",
  description: "Celebrate Nyeri's content creators with your vote.",
  icons: {
    icon: "/images/logo.jpg",
    shortcut: "/images/logo.jpg",
    apple: "/images/logo.jpg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
