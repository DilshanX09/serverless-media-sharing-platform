import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import ChunkErrorHandler from "@/components/system/ChunkErrorHandler";
import { DM_Sans } from "next/font/google";

export const metadata: Metadata = {
  title: "Shutterly",
  description: "A minimal, beautiful photo sharing experience",
};

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`bg-base text-ink ${dmSans.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <ToastProvider>
            <ChunkErrorHandler />
            <div className="min-h-screen flex flex-col font-sans antialiased">
              <main className="flex-1">{children}</main>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
