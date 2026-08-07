"use client";

import { useState } from "react";

export default function SchedulePage() {
  // 入力欄の文字
  const [schedule, setSchedule] = useState("");

  // 予定一覧
  const [schedules, setSchedules] = useState<string[]>([]);

  // 「追加」ボタンを押したとき
  const addSchedule = () => {
    // 空欄なら追加しない
    if (schedule.trim() === "") return;

    // 配列に予定を追加
    setSchedules([...schedules, schedule]);

    // 入力欄を空にする
    setSchedule("");
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

        <button onClick={addSchedule}>追加</button>
      </section>

      <section className="card">
        <h2>予定一覧</h2>

        {schedules.length === 0 ? (
          <p>予定はありません</p>
        ) : (
          <ul>
            {schedules.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}