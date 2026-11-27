"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";

type HabitRecord = {
  id: number;
  habitId: number;
  date: string;
  completed: boolean;
};

type Habit = {
  id: number;
  title: string;
  category: string;
  frequency: string;
  weekdays: string;
  active: boolean;
  records: HabitRecord[];
};

const categories = ["健康", "運動", "勉強", "生活", "仕事", "その他"];
const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function dateText(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentStreak(records: HabitRecord[]) {
  const completedDates = new Set(records.filter((record) => record.completed).map((record) => record.date));
  let streak = 0;
  const cursor = new Date();

  if (!completedDates.has(dateText(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (completedDates.has(dateText(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function periodRate(records: HabitRecord[], days: number) {
  const completedDates = new Set(records.filter((record) => record.completed).map((record) => record.date));
  let possible = 0;
  let completed = 0;
  const cursor = new Date();

  for (let i = 0; i < days; i += 1) {
    const date = dateText(cursor);
    possible += 1;
    if (completedDates.has(date)) completed += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return possible === 0 ? 0 : Math.round((completed / possible) * 100);
}

export default function HabitPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("健康");
  const [frequency, setFrequency] = useState("毎日");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => dateText(new Date()).slice(0, 7));

  const loadHabits = async () => {
    try {
      setHabits(await apiRequest<Habit[]>("/api/habits"));
    } catch (error) {
      console.error("習慣の読み込みに失敗しました", error);
    }
  };

  useEffect(() => {
    void loadHabits();
  }, []);

  const submitHabit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const payload = {
      title: trimmedTitle,
      category,
      frequency,
      weekdays: frequency === "曜日指定" ? selectedWeekdays.join(",") : "",
      active: true,
    };

    try {
      if (editingId !== null) {
        await apiRequest<Habit>(`/api/habits/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<Habit>("/api/habits", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      cancelEditing();
      await loadHabits();
    } catch (error) {
      console.error("習慣の保存に失敗しました", error);
    }
  };

  const startEditing = (habit: Habit) => {
    setEditingId(habit.id);
    setTitle(habit.title);
    setCategory(habit.category);
    setFrequency(habit.frequency);
    setSelectedWeekdays(habit.weekdays ? habit.weekdays.split(",") : []);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTitle("");
    setCategory("健康");
    setFrequency("毎日");
    setSelectedWeekdays([]);
  };

  const deleteHabit = async (id: number) => {
    if (!window.confirm("この習慣と記録履歴を削除しますか？")) return;
    try {
      await apiRequest<void>(`/api/habits/${id}`, { method: "DELETE" });
      await loadHabits();
    } catch (error) {
      console.error("習慣の削除に失敗しました", error);
    }
  };

  const toggleRecord = async (habit: Habit, date: string) => {
    const checked = habit.records.some((record) => record.date === date && record.completed);
    try {
      await apiRequest<void>(`/api/habits/${habit.id}/records/${date}`, {
        method: checked ? "DELETE" : "PUT",
      });
      await loadHabits();
    } catch (error) {
      console.error("達成記録の更新に失敗しました", error);
    }
  };

  const toggleWeekday = (day: string) => {
    setSelectedWeekdays((previous) =>
      previous.includes(day) ? previous.filter((item) => item !== day) : [...previous, day],
    );
  };

  const filteredHabits = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return habits.filter((habit) =>
      !keyword || `${habit.title} ${habit.category}`.toLowerCase().includes(keyword),
    );
  }, [habits, search]);

  const weekDates = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return dateText(date);
    });
  }, []);

  const monthDates = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return Array.from({ length: lastDay }, (_, index) =>
      `${selectedMonth}-${String(index + 1).padStart(2, "0")}`,
    );
  }, [selectedMonth]);

  return (
    <main className="container habit-container">
      <h1>🌱 習慣管理</h1>

      <section className="card">
        <h2>{editingId === null ? "習慣を登録" : "習慣を編集"}</h2>
        <form onSubmit={submitHabit} className="habit-form">
          <input type="text" placeholder="習慣名" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <div className="habit-form-grid">
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
              <option value="毎日">毎日</option>
              <option value="曜日指定">曜日指定</option>
            </select>
          </div>
          {frequency === "曜日指定" && (
            <div className="weekday-picker">
              {weekdays.map((day) => (
                <button type="button" key={day} className={selectedWeekdays.includes(day) ? "active-weekday" : ""} onClick={() => toggleWeekday(day)}>{day}</button>
              ))}
            </div>
          )}
          <div className="schedule-form-actions">
            <button type="submit">{editingId === null ? "登録" : "更新"}</button>
            {editingId !== null && <button type="button" className="secondary-button" onClick={cancelEditing}>キャンセル</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="habit-header">
          <h2>習慣一覧</h2>
          <input type="search" placeholder="習慣を検索" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        {filteredHabits.length === 0 ? (
          <p>習慣はありません</p>
        ) : filteredHabits.map((habit) => {
          const today = dateText(new Date());
          const checkedToday = habit.records.some((record) => record.date === today && record.completed);
          const streak = currentStreak(habit.records);
          const weekRate = periodRate(habit.records, 7);
          const monthRate = periodRate(habit.records, 30);

          return (
            <article className="item-card habit-card" key={habit.id}>
              <div className="habit-card-header">
                <div>
                  <strong>{habit.title}</strong>
                  <small>{habit.category} ・ {habit.frequency === "曜日指定" ? habit.weekdays : habit.frequency}</small>
                </div>
                <button type="button" className={checkedToday ? "habit-check checked" : "habit-check"} onClick={() => toggleRecord(habit, today)}>
                  {checkedToday ? "✓ 達成" : "達成する"}
                </button>
              </div>

              <div className="habit-stats">
                <div><strong>{streak}日</strong><span>連続達成</span></div>
                <div><strong>{weekRate}%</strong><span>7日達成率</span></div>
                <div><strong>{monthRate}%</strong><span>30日達成率</span></div>
              </div>

              <div className="habit-history">
                {weekDates.map((date) => {
                  const checked = habit.records.some((record) => record.date === date && record.completed);
                  return (
                    <button type="button" key={date} className={checked ? "history-day checked" : "history-day"} onClick={() => toggleRecord(habit, date)}>
                      <span>{new Date(`${date}T12:00:00`).toLocaleDateString("ja-JP", { weekday: "narrow" })}</span>
                      <strong>{Number(date.slice(-2))}</strong>
                      <b>{checked ? "✓" : ""}</b>
                    </button>
                  );
                })}
              </div>

              <div className="habit-actions">
                <button type="button" className="edit-button" onClick={() => startEditing(habit)}>編集</button>
                <button type="button" className="delete-button" onClick={() => deleteHabit(habit.id)}>削除</button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="card">
        <div className="habit-header">
          <h2>月間履歴</h2>
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </div>
        {filteredHabits.map((habit) => (
          <div className="habit-month-row" key={habit.id}>
            <strong>{habit.title}</strong>
            <div className="habit-month-grid">
              {monthDates.map((date) => {
                const checked = habit.records.some((record) => record.date === date && record.completed);
                return <span key={date} className={checked ? "month-dot checked" : "month-dot"}>{checked ? "✓" : ""}</span>;
              })}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
