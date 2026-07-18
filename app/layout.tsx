import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { KeyboardProvider } from "@/components/KeyboardProvider";
import { ConfigProvider } from "@/components/ConfigProvider";
import { StatusBar } from "@/components/StatusBar";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tmuxcheatsheet.dev"),
  title: {
    default: "tmuxlab — the tmux cheat sheet that speaks tmux",
    template: "%s · tmuxlab",
  },
  description:
    "Interactive tmux cheat sheet, tutorial, and config generator. Every default keybinding, searchable and copy-ready — verified against the current tmux release.",
  keywords: [
    "tmux",
    "tmux cheat sheet",
    "tmux commands",
    "tmux tutorial",
    "tmux config",
  ],
  openGraph: {
    type: "website",
    siteName: "tmuxlab",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <KeyboardProvider>
          <ConfigProvider>
            <div className="flex-1 pb-10">{children}</div>
            <StatusBar />
          </ConfigProvider>
        </KeyboardProvider>
      </body>
    </html>
  );
}
