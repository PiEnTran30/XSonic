import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { AnnouncementModal } from "@/components/announcement-modal";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  fallback: ["system-ui", "arial"]
});

export const metadata: Metadata = {
  title: "X-Sonic - AI Audio/Video Studio",
  description: "Professional AI-powered audio and video processing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            {children}
            <AnnouncementModal />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

