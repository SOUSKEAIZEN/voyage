import { Geist, Geist_Mono } from "next/font/google";
import { CustomCursor } from "@/components/ui/custom-cursor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Nexus | Global Control Plane",
  description: "Secure, multi-tenant state management and ledger for enterprise nodes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-indigo-500/30 selection:text-white`}>
        {/* Global Trailing Cursor injected at the highest DOM level */}
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}