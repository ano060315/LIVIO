"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "./lib/api";

type Schedule = {
  id: number;
  title: string;
  date: string;
  time: string;
};

type Task = {
  id: number;
  title: string;
  completed: boolean;
};

type Transaction = {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  memo: string;
};

type Memo = {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
};

export default function Home() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [scheduleData, taskData, transactionData, memoData] = await Promise.all([
          apiRequest<Schedule[]>("/api/schedules"),
          apiRequest<Task[]>("/api/tasks"),
          apiRequest<Transaction[]>("/api/transactions"),
          apiRequest<Memo[]>("/api/memos"),
        ]);

        setSchedules(scheduleData);
        setTasks(taskData);
        setTransactions(transactionData);
        setMemos(memoData);
      } catch (error) {
        console.error("ホームデータの読み込みに失敗しました", error);
      }
    };

    void loadData();
  }, []);

  const today = new Date();
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todaySchedules = schedules
    .filter((schedule) => typeof schedule === "object" && schedule.date === todayText)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const weekSchedules = schedules.filter((schedule) => {
    if (typeof schedule !== "object" || !schedule.date) return false;
    const scheduleDate = new Date(`${schedule.date}T00:00:00`);
    return scheduleDate >= new Date(`${todayText}T00:00:00`) && scheduleDate < weekEnd;
  }).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const todayExpenses = transactions
    .filter((transaction) => transaction.type === "expense" && transaction.date === todayText)
    .reduce((total, transaction) => total + transaction.amount, 0);

  const remainingTasks = tasks.filter((task) => !task.completed);
  const recentMemos = [...memos]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  return (
    <main className="container">
      <h1>LIVIEW</h1>

      <section className="card">
        <h2>📅 今日の予定</h2>
        {todaySchedules.length === 0 ? (
          <p>予定はありません</p>
        ) : (
          <ul className="home-list">
            {todaySchedules.map((schedule) => (
              <li key={schedule.id}><strong>{schedule.time}</strong> {schedule.title}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>📆 今週の予定</h2>
        {weekSchedules.length === 0 ? (
          <p>予定はありません</p>
        ) : (
          <ul className="home-list">
            {weekSchedules.map((schedule) => (
              <li key={schedule.id}><strong>{schedule.date}</strong>{schedule.time ? ` ${schedule.time}` : ""} {schedule.title}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>💰 今日の支出</h2>
        <p>¥{todayExpenses.toLocaleString()}</p>
      </section>

      <section className="card">
        <h2>✅ 今日のタスク</h2>
        {remainingTasks.length === 0 ? (
          <p>タスクはありません</p>
        ) : (
          <ul className="home-list">
            {remainingTasks.map((task) => <li key={task.id}>{task.title}</li>)}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>📝 最近のメモ</h2>
        {recentMemos.length === 0 ? (
          <p>メモはありません</p>
        ) : (
          <ul className="home-list">
            {recentMemos.map((memo) => (
              <li key={memo.id}>
                <strong>{memo.title}</strong> - {memo.content}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}