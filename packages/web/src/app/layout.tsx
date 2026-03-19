import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Dixit — AI-Powered Card Game",
  description:
    "Create AI-generated art cards and guess which one the storyteller made. A multiplayer game inspired by Dixit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
