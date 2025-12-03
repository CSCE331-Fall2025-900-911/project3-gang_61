import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNavBar from "@/components/TopNavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Sharetea Kiosk",
  description: "Boba shop kiosk application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <TopNavBar />
        {children}
      </body>
    </html>
  );
}
