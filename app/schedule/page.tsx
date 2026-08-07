"use client";

import { useEffect, useState } from "react";

export default function SchedulePage() {
  // 入力欄
  const [schedule, setSchedule] = useState("");

  // 予定一覧
  const [schedules, setSchedules] = useState<string[]>([]);

  const [isLoaded, setIsLoaded] = useState(false);

  // 初回のみ読み込み
  useEffect(() => {
    const saved = localStorage.getItem("schedules");

    if (saved) {
      try {
        setSchedules(JSON.parse(saved));
      } catch (error) {
        console.error("読み込み失敗", error);
      }
    }
    setIsLoaded(true);
  }, []);

  // 予定が変わるたび保存
useEffect(() => {
  if (!isLoaded) return;

  localStorage.setItem(
    "schedules",
    JSON.stringify(schedules)
  );
}, [schedules, isLoaded]);

  // 追加
  const addSchedule = () => {
    if (!schedule.trim()) return;

    setSchedules((prev) => [...prev, schedule]);
    setSchedule("");
  };

  // 削除
  const deleteSchedule = (index: number) => {
    setSchedules((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  return (
    <main className="container">
      <h1>📅 予定管理</h1>

      <section className="card">
        <h2>予定を追加</h2>

        <input
          type="text"
          placeholder="予定を入力"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
        />

        <button onClick={addSchedule}>
          追加
        </button>
      </section>

      <section className="card">
        <h2>予定一覧</h2>

        {schedules.length === 0 ? (
          <p>予定はありません</p>
        ) : (
          <ul>
            {schedules.map((item, index) => (
              <li
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                {item}

                <button
                  style={{
                    width: "80px",
                    backgroundColor: "#ef4444",
                  }}
                  onClick={() =>
                    deleteSchedule(index)
                  }
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}