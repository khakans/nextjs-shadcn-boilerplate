import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import type { LanguagePreference } from "@/lib/theme";
import { ThemePreferenceProvider } from "@/lib/theme";
import { themeInitializerScript } from "@/lib/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Platform",
  description: "Platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const languageCookie = cookieStore.get("expensesman-language")?.value;
  const initialLanguage: LanguagePreference =
    languageCookie === "id" ? "id" : "en";

  return (
    <html
      lang={initialLanguage}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializerScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemePreferenceProvider initialLanguage={initialLanguage}>
          {children}
        </ThemePreferenceProvider>
        <Toaster />
      </body>
    </html>
  );
}
