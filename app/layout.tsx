import "./globals.css";
import BottomNav from "./components/BottomNav";
import AuthGuard from "./components/AuthGuard";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "LIVIEW",
  description: "予定・タスク・家計簿・メモをまとめる生活管理アプリ",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthGuard>
          {children}
          <BottomNav />
        </AuthGuard>
      </body>
    </html>
  );
}