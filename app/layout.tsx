import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/professional-popup.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ModalStackProvider } from "@/components/map/ModalStack";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Live Map Systems",
  description: "Real-time interactive mapping application with OpenStreetMap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ModalStackProvider>
              {children}
            </ModalStackProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
