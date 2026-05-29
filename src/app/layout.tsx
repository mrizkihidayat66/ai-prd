import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/common/theme-provider";
import { ConfirmProvider } from "@/components/common/confirm-dialog";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { GlobalErrorHandler } from "@/components/common/global-error-handler";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI-PRD — AI-Powered PRD Generator",
  description: "Generate comprehensive Product Requirements Documents through AI-guided conversations. Streaming chat, tool calls, Mermaid diagrams, and single-file PRD output.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <GlobalErrorHandler />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <ConfirmProvider>
              <TooltipProvider>
                <AppShell>{children}</AppShell>
                <Toaster richColors closeButton position="top-right" />
              </TooltipProvider>
            </ConfirmProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
