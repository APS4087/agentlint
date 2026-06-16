import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";

import { Navigation } from "@/components/shared/Navigation";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgentLint — MCP Security Scanner",
  description:
    "Find security flaws in your MCP server configs before attackers do. Static analysis mapped to the OWASP Agentic Top 10.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
