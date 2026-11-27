"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";

type Task = {
  id: number;
  title: string;
  completed: boolean;
  dueDate: string;
  priority: string;
  category: string;
};

const categories = ["仕事", "勉強", "私用", "買い物", "健康", "その他"];
const priorities = ["高", "中", "低"];

type FilterMode = "all" | "active" | "completed" | "overdue";

function todayText() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("中");
  const [category, setCategory] = useState("仕事");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  const loadTasks = async () => {
    try {
      setTasks(await apiRequest<Task[]>("/api/tasks"));
    } catch (error) {
      console.error("タスクの読み込みに失敗しました", error);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const payload = {
      title: trimmedTitle,
      dueDate,
      priority,
      category,
      completed: editingId !== null
        ? tasks.find((task) => task.id === editingId)?.completed ?? false
        : false,
    };

    try {
      if (editingId !== null) {
        await apiRequest<Task>(`/api/tasks/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<Task>("/api/tasks", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      cancelEditing();
      await loadTasks();
    } catch (error) {
      console.error("タスクの保存に失敗しました", error);
    }
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDueDate(task.dueDate || "");
    setPriority(task.priority || "中");
    setCategory(task.category || "仕事");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTitle("");
    setDueDate("");
    setPriority("中");
    setCategory("仕事");
  };

  const toggleTask = async (task: Task) => {
    try {
      await apiRequest<Task>(`/api/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: task.title,
          dueDate: task.dueDate || "",
          priority: task.priority || "中",
          category: task.category || "その他",
          completed: !task.completed,
        }),
      });
      await loadTasks();
    } catch (error) {
      console.error("タスクの更新に失敗しました", error);
    }
  };

  const addToSchedule = async (task: Task) => {
    if (!task.dueDate) {
      window.alert("カレンダーへ追加するには期限を設定してください。");
      return;
    }

    try {
      await apiRequest("/api/schedules", {
        method: "POST",
        body: JSON.stringify({
          title: task.title,
          date: task.dueDate,
          time: "09:00",
          endTime: "09:30",
          category: task.category || "仕事",
          repeatRule: "なし",
          taskId: task.id,
        }),
      });
      window.alert("カレンダーへ予定を追加しました。");
    } catch (error) {
      console.error("カレンダーへの追加に失敗しました", error);
      window.alert("カレンダーへの追加に失敗しました。");
    }
  };

  const deleteTask = async (id: number) => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    try {
      await apiRequest<void>(`/api/tasks/${id}`, { method: "DELETE" });
      await loadTasks();
    } catch (error) {
      console.error("タスクの削除に失敗しました", error);
    }
  };

  const today = todayText();
  const completedCount = tasks.filter((task) => task.completed).length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  const overdueCount = tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today).length;

  const filteredTasks = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...tasks]
      .filter((task) => {
        if (filterMode === "active" && task.completed) return false;
        if (filterMode === "completed" && !task.completed) return false;
        if (filterMode === "overdue" && (task.completed || !task.dueDate || task.dueDate >= today)) return false;
        if (keyword && !`${task.title} ${task.category} ${task.priority}`.toLowerCase().includes(keyword)) return false;
        return true;
      })
      .sort((a, b) => {
        const priorityOrder = { 高: 0, 中: 1, 低: 2 };
        const leftPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
        const rightPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
      });
  }, [tasks, filterMode, search, today]);

  return (
    <main className="container task-container">
      <h1>✅ タスク管理</h1>

      <section className="card task-summary-card">
        <div className="completion-summary">
          <div>
            <strong>{completionRate}%</strong>
            <span>完了率</span>
          </div>
          <div>
            <strong>{completedCount}/{tasks.length}</strong>
            <span>完了数</span>
          </div>
          <div>
            <strong>{overdueCount}</strong>
            <span>期限切れ</span>
          </div>
        </div>
        <div className="completion-bar" aria-label={`完了率 ${completionRate}%`}>
          <span style={{ width: `${completionRate}%` }} />
        </div>
      </section>

      <section className="card">
        <h2>{editingId === null ? "タスクを追加" : "タスクを編集"}</h2>
        <form onSubmit={submitTask} className="task-form">
          <input type="text" placeholder="やることを入力" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <div className="task-form-grid">
            <label>期限<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
            <label>優先度
              <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label>カテゴリー
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="schedule-form-actions">
            <button type="submit">{editingId === null ? "追加" : "保存"}</button>
            {editingId !== null && <button type="button" className="secondary-button" onClick={cancelEditing}>キャンセル</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="task-filter-header">
          <h2>タスク一覧</h2>
          <span>{filteredTasks.length}件</span>
        </div>
        <input type="search" placeholder="タスク・カテゴリ・優先度で検索" value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="task-filter-tabs">
          {([
            ["all", "すべて"],
            ["active", "未完了"],
            ["completed", "完了"],
            ["overdue", "期限切れ"],
          ] as [FilterMode, string][]).map(([mode, label]) => (
            <button type="button" key={mode} className={filterMode === mode ? "active-filter" : ""} onClick={() => setFilterMode(mode)}>{label}</button>
          ))}
        </div>

        {filteredTasks.length === 0 ? (
          <p>該当するタスクはありません</p>
        ) : (
          <ul className="task-list">
            {filteredTasks.map((task) => {
              const overdue = !task.completed && task.dueDate && task.dueDate < today;
              return (
                <li className={`item-card task-item priority-${task.priority || "中"}${overdue ? " overdue-task" : ""}`} key={task.id}>
                  <div className="task-row">
                    <label className="task-title">
                      <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task)} />
                      <span className={task.completed ? "completed-task" : ""}>{task.title}</span>
                    </label>
                    <div className="item-actions">
                      <button type="button" className="edit-button" onClick={() => startEditing(task)}>編集</button>
                      <button type="button" className="delete-button" onClick={() => deleteTask(task.id)}>削除</button>
                      {task.dueDate && (
                        <button type="button" className="calendar-link-button" onClick={() => addToSchedule(task)}>予定へ</button>
                      )}
                    </div>
                  </div>
                  <div className="task-meta">
                    <span className="task-category">{task.category || "その他"}</span>
                    <span className="priority-badge">優先度 {task.priority || "中"}</span>
                    {task.dueDate && <span className={overdue ? "due-date overdue-date" : "due-date"}>期限 {task.dueDate}</span>}
                    {overdue && <span className="overdue-badge">期限切れ</span>}
                  </div>

                  {editingId === task.id && (
                    <form className="inline-editor" onSubmit={submitTask}>
                      <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="タスク名" autoFocus />
                      <div className="inline-editor-fields">
                        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} aria-label="期限" />
                        <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                          {priorities.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                      <select value={category} onChange={(event) => setCategory(event.target.value)}>
                        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      <div className="inline-editor-actions">
                        <button type="submit">保存</button>
                        <button type="button" className="secondary-button" onClick={cancelEditing}>キャンセル</button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
