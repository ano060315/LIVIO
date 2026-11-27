"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem("theme") === "dark";
    document.documentElement.classList.toggle("dark", enabled);
    setLoggedIn(Boolean(localStorage.getItem("authToken")));
  }, [pathname]);

  if (pathname === "/login" || pathname === "/register" || !loggedIn) return null;

  return (
    <nav>
      <Link href="/">🏠 ホーム</Link>
      <Link href="/schedule">📅 予定</Link>
      <Link href="/money">💰 お金</Link>
      <Link href="/task">✅ タスク</Link>
      <Link href="/memo">📝 メモ</Link>
      <Link href="/habit">🌱 習慣</Link>
      <Link href="/settings">⚙️ 設定</Link>
    </nav>
  );
}