import Link from "next/link";

export default function BottomNav() {
  return (
    <nav>
      <Link href="/">🏠 ホーム</Link>
      <Link href="/schedule">📅 予定</Link>
      <Link href="/money">💰 お金</Link>
      <Link href="/task">✅ タスク</Link>
    </nav>
  );
}