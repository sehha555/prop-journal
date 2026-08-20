import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "prop-journal",
  description: "期貨 prop firm 交易日誌",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="grid min-h-screen grid-cols-[188px_minmax(0,1fr)]">
          <Sidebar />
          <main className="flex flex-col gap-4 px-7 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
