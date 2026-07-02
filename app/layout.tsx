import type { Metadata } from "next";
import { League_Spartan, Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import GlobalChatBubble from "@/components/GlobalChatBubble";

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hub Shell",
  description: "Your AI Business OS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${leagueSpartan.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-light min-h-screen" suppressHydrationWarning>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 p-8">
            {children}
          </main>
        </div>
        <GlobalChatBubble />
      </body>
    </html>
  );
}
