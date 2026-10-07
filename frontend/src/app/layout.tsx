import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "SupportAI",
  description: "B2B SaaS customer support copilot interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body className="font-sans antialiased bg-background text-foreground">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}