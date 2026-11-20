import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const body = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const display = Lora({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Relationship Memory",
  description: "Nơi giữ lại câu chuyện của hai bạn.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
