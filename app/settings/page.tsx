"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [authUser, setAuthUser] = useState<{
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const enabled = saved === "dark";
    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark", enabled);

    const savedUser = localStorage.getItem("authUser");
    if (savedUser) setAuthUser(JSON.parse(savedUser));
  }, []);

  const toggleTheme = () => {
    const enabled = !darkMode;
    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark", enabled);
    localStorage.setItem("theme", enabled ? "dark" : "light");
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    router.push("/login");
  };

  const resetAllData = async () => {
    if (!window.confirm("予定・タスク・家計簿・メモのデータをすべて削除しますか？")) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/user/data`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });

      if (!response.ok) throw new Error("delete failed");
      window.alert("保存データを初期化しました。");
    } catch (error) {
      console.error("データ初期化に失敗しました", error);
      window.alert("データの初期化に失敗しました。");
    }
  };

  return (
    <main className="container">
      <h1>⚙️ 設定</h1>

      {authUser && (
        <section className="card">
          <h2>アカウント</h2>
          <p>
            {authUser.name}（{authUser.email}）
          </p>
          <button type="button" onClick={logout}>
            ログアウト
          </button>
        </section>
      )}

      <section className="card">
        <h2>テーマ</h2>
        <label className="theme-setting">
          <span>{darkMode ? "ダークモード" : "ライトモード"}</span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={toggleTheme}
          />
        </label>
      </section>

      <section className="card">
        <h2>データ管理</h2>
        <p>ローカル設定を初期化します。</p>
        <button
          type="button"
          className="delete-button"
          onClick={resetAllData}
        >
          保存データを初期化
        </button>
      </section>
    </main>
  );
}
