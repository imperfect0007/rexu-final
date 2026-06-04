import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ErrorReporter from "@/components/ErrorReporter";
import ConditionalFooter from "@/components/ConditionalFooter";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { CustomCursor } from "@/components/CustomCursor";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rexu.in"),
  title: "REXU – Emergency Info via QR",
  description:
    "Instant emergency information via QR codes on vehicles and helmets.",
  icons: {
    // Query string busts CDN/browser caches that still hold the old Vercel default
    icon: [
      { url: "/favicon.ico?v=rexu2", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icon.png",
  },
  openGraph: {
    title: "REXU – Emergency Info via QR",
    description:
      "Instant emergency information via QR codes on vehicles and helmets.",
    siteName: "REXU",
    images: [{ url: "/icon.png", width: 1024, height: 1024 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} antialiased bg-rexu-grid text-foreground`}>
        <CustomCursor />
        <InteractiveBackground />
        <ErrorReporter />
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <ConditionalFooter />
        </div>
      </body>
    </html>
  );
}
