import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ShiftActionProvider } from "@/components/ShiftActionContext";

export const metadata: Metadata = {
  title: "Sabana FC POS",
  description: "Sistem POS & Manajemen Bahan Baku Sabana Fried Chicken",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SabanaFC" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#DC2626",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ShiftActionProvider>
              <AppShell>{children}</AppShell>
            </ShiftActionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
