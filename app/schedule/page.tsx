"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";

type Schedule = {
  id: number;
  title: string;
  date: string;
  time: string;
  endTime: string;
  category: string;
  repeatRule: string;
  taskId: number | null;
};

type Task = {
  id: number;
  title: string;
  completed: boolean;
};

type ViewMode = "month" | "week" | "day";

const categories = [
  { name: "仕事", color: "#4f46e5" },
  { name: "私用", color: "#16a34a" },
  { name: "勉強", color: "#0284c7" },
  { name: "予定", color: "#ea580c" },
  { name: "大事", color: "#dc2626" },
];

const repeatOptions = ["なし", "毎日", "毎週", "毎月"];
const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

function toDateText(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => toDateText(new Date()));
  const [time, setTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState("仕事");
  const [repeatRule, setRepeatRule] = useState("なし");
  const [taskId, setTaskId] = useState<number | "">("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [visibleDate, setVisibleDate] = useState(() => toDateText(new Date()));

  const loadData = async () => {
    try {
      const [scheduleData, taskData] = await Promise.all([
        apiRequest<Schedule[]>("/api/schedules"),
        apiRequest<Task[]>("/api/tasks"),
      ]);
      setSchedules(scheduleData);
      setTasks(taskData);
    } catch (error) {
      console.error("予定データの読み込みに失敗しました", error);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const submitSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !date) return;

    const payload = {
      title: trimmedTitle,
      date,
      time,
      endTime,
      category,
      repeatRule,
      taskId: taskId === "" ? null : Number(taskId),
    };

    try {
      if (editingId !== null) {
        await apiRequest<Schedule>(`/api/schedules/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<Schedule>("/api/schedules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      cancelEditing();
      await loadData();
    } catch (error) {
      console.error("予定の保存に失敗しました", error);
    }
  };

  const startEditing = (schedule: Schedule) => {
    setEditingId(schedule.id);
    setTitle(schedule.title);
    setDate(schedule.date);
    setTime(schedule.time || "09:00");
    setEndTime(schedule.endTime || "10:00");
    setCategory(schedule.category || "仕事");
    setRepeatRule(schedule.repeatRule || "なし");
    setTaskId(schedule.taskId ?? "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTitle("");
    setTime("09:00");
    setEndTime("10:00");
    setCategory("仕事");
    setRepeatRule("なし");
    setTaskId("");
  };

  const deleteSchedule = async (id: number) => {
    if (!window.confirm("この予定を削除しますか？")) return;
    try {
      await apiRequest<void>(`/api/schedules/${id}`, { method: "DELETE" });
      await loadData();
    } catch (error) {
      console.error("予定の削除に失敗しました", error);
    }
  };

  const visible = useMemo(() => {
    const base = new Date(`${visibleDate}T12:00:00`);
    const keyword = search.trim().toLowerCase();

    return schedules
      .filter((schedule) => {
        if (!keyword) return true;
        const linkedTask = tasks.find((task) => task.id === schedule.taskId)?.title || "";
        return `${schedule.title} ${schedule.category} ${linkedTask}`.toLowerCase().includes(keyword);
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [schedules, search, tasks, visibleDate]);

  const shiftVisibleDate = (offset: number) => {
    const base = new Date(`${visibleDate}T12:00:00`);
    if (viewMode === "month") base.setMonth(base.getMonth() + offset);
    if (viewMode === "week") base.setDate(base.getDate() + offset * 7);
    if (viewMode === "day") base.setDate(base.getDate() + offset);
    setVisibleDate(toDateText(base));
  };

  const categoryColor = (name: string) =>
    categories.find((item) => item.name === name)?.color || "#64748b";

  const displayTitle = (() => {
    const dateObject = new Date(`${visibleDate}T12:00:00`);
    if (viewMode === "day") return dateObject.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
    if (viewMode === "week") {
      const start = new Date(dateObject);
      start.setDate(start.getDate() - start.getDay());
      return `${start.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}週`;
    }
    return dateObject.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  })();

  const selectedSchedules = (() => {
    const base = new Date(`${visibleDate}T12:00:00`);
    if (viewMode === "day") return visible.filter((item) => item.date === visibleDate);

    if (viewMode === "week") {
      const start = new Date(base);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return visible.filter((item) => {
        const itemDate = new Date(`${item.date}T12:00:00`);
        return itemDate >= start && itemDate < end;
      });
    }

    const prefix = visibleDate.slice(0, 7);
    return visible.filter((item) => item.date.startsWith(prefix));
  })();

  const monthGrid = (() => {
    const base = new Date(`${visibleDate}T12:00:00`);
    const first = new Date(base.getFullYear(), base.getMonth(), 1);
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const days: (string | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let day = 1; day <= last.getDate(); day++) {
      days.push(toDateText(new Date(base.getFullYear(), base.getMonth(), day)));
    }
    return days;
  })();

  const weekDates = (() => {
    const base = new Date(`${visibleDate}T12:00:00`);
    const start = new Date(base);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const dateObject = new Date(start);
      dateObject.setDate(start.getDate() + index);
      return toDateText(dateObject);
    });
  })();

  return (
    <main className="container schedule-container">
      <h1>📅 予定管理</h1>

      <section className="card schedule-toolbar">
        <input type="search" placeholder="予定・カテゴリ・ToDoを検索" value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="view-switcher">
          {(["month", "week", "day"] as ViewMode[]).map((mode) => (
            <button type="button" key={mode} className={viewMode === mode ? "active-view" : ""} onClick={() => setViewMode(mode)}>
              {mode === "month" ? "月" : mode === "week" ? "週" : "日"}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{editingId === null ? "予定を登録" : "予定を編集"}</h2>
        <form onSubmit={submitSchedule} className="schedule-form">
          <input type="text" placeholder="予定名" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <div className="schedule-form-grid">
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </div>
          <div className="schedule-form-grid">
            <label>開始<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
            <label>終了<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
          </div>
          <div className="schedule-form-grid">
            <select value={repeatRule} onChange={(event) => setRepeatRule(event.target.value)}>
              {repeatOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={taskId} onChange={(event) => setTaskId(event.target.value === "" ? "" : Number(event.target.value))}>
              <option value="">ToDoに紐づけない</option>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.completed ? "✓ " : ""}{task.title}</option>)}
            </select>
          </div>
          <div className="schedule-form-actions">
            <button type="submit">{editingId === null ? "登録" : "更新"}</button>
            {editingId !== null && <button type="button" className="secondary-button" onClick={cancelEditing}>キャンセル</button>}
          </div>
        </form>
      </section>

      <section className="card schedule-calendar-card">
        <div className="calendar-header">
          <button type="button" onClick={() => shiftVisibleDate(-1)}>前へ</button>
          <h2>{displayTitle}</h2>
          <button type="button" onClick={() => shiftVisibleDate(1)}>次へ</button>
        </div>

        {viewMode === "month" && (
          <div className="calendar-grid">
            {weekDays.map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
            {monthGrid.map((day, index) => (
              <button type="button" className="calendar-day" key={day ?? `empty-${index}`} onClick={() => day && setVisibleDate(day)}>
                {day && (
                  <>
                    <strong>{Number(day.slice(-2))}</strong>
                    {schedules.filter((item) => item.date === day).slice(0, 3).map((item) => (
                      <span className="calendar-schedule" key={item.id} style={{ backgroundColor: categoryColor(item.category) }}>{item.time} {item.title}</span>
                    ))}
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {viewMode === "week" && (
          <div className="week-grid">
            {weekDates.map((day) => (
              <div className="week-column" key={day}>
                <button type="button" className="week-date" onClick={() => { setVisibleDate(day); setViewMode("day"); }}>
                  {new Date(`${day}T12:00:00`).toLocaleDateString("ja-JP", { weekday: "short", day: "numeric" })}
                </button>
                {visible.filter((item) => item.date === day).map((item) => (
                  <div className="week-schedule" key={item.id} style={{ borderLeftColor: categoryColor(item.category) }}>
                    <strong>{item.time}</strong> {item.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {viewMode === "day" && (
          <div className="day-view">
            {selectedSchedules.length === 0 ? <p>この日の予定はありません</p> : selectedSchedules.map((item) => (
              <div className="day-schedule" key={item.id} style={{ borderLeftColor: categoryColor(item.category) }}>
                <strong>{item.time}{item.endTime ? `〜${item.endTime}` : ""}</strong>
                <span>{item.title}</span>
                <small>{item.category}{item.repeatRule !== "なし" ? ` ・ ${item.repeatRule}` : ""}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>予定一覧</h2>
        {selectedSchedules.length === 0 ? (
          <p>表示期間の予定はありません</p>
        ) : selectedSchedules.map((schedule) => (
          <article className="item-card" key={schedule.id}>
            <div className="schedule-row">
              <div>
                <strong>{schedule.title}</strong>
                <small>{schedule.date} {schedule.time}{schedule.endTime ? `〜${schedule.endTime}` : ""} ・ {schedule.category}</small>
                {schedule.taskId && <small>ToDo: {tasks.find((task) => task.id === schedule.taskId)?.title || "紐づけ済み"}</small>}
              </div>
              <div className="item-actions">
                <button type="button" className="edit-button" onClick={() => startEditing(schedule)}>編集</button>
                <button type="button" className="delete-button" onClick={() => deleteSchedule(schedule.id)}>削除</button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}