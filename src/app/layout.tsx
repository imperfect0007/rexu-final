import type { Metadata } from "next";
import "./globals.css";
import ErrorReporter from "@/components/ErrorReporter";
import ConditionalFooter from "@/components/ConditionalFooter";

export const metadata: Metadata = {
  title: "REXU – Emergency Info via QR",
  description: "Instant emergency information via QR codes on vehicles and helmets.",
  openGraph: {
    title: "REXU – Emergency Info via QR",
    description: "Instant emergency information via QR codes on vehicles and helmets.",
    siteName: "REXU",
    images: [{ url: "/icon.png", width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">
        <ErrorReporter />
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <ConditionalFooter />
        </div>
      </body>
    </html>
  );
}
