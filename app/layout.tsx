import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import GlobalChatBubble from "@/components/GlobalChatBubble";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Update HUB_NAME and description to match your DESIGN.md values
export const metadata: Metadata = {
  title: "My Hub",
  description: "Your AI Business OS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-light min-h-screen">
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
