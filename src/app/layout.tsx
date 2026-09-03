import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { BusinessProvider } from "./context/BusinessContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentify | Your 24/7 AI Customer Agent",
  description: "Add a smart AI agent to your website in 5 minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <BusinessProvider>
          {children}
          <Toaster position="bottom-right" />
        </BusinessProvider>
      </body>
    </html>
  );
}
