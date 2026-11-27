"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

type TransactionType = "income" | "expense";

type Budget = { month: string; amount: number };
type FixedExpense = { id: number; name: string; amount: number; category: string; dueDay: number; active: boolean };
type SavingGoal = { id: number; name: string; targetAmount: number; savedAmount: number; targetDate: string };

type Transaction = {
  id: number;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  memo: string;
};

const categories = {
  income: ["給与", "お小遣い", "副収入", "その他"],
  expense: ["食費", "交通費", "住居", "娯楽", "日用品", "その他"],
};

export default function MoneyPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories.expense[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [budget, setBudget] = useState<Budget>({ month, amount: 0 });
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [budgetInput, setBudgetInput] = useState("");
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedCategory, setFixedCategory] = useState("住居");
  const [fixedDueDay, setFixedDueDay] = useState("1");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [goalDate, setGoalDate] = useState("");

  const loadTransactions = async () => {
    try {
      setTransactions(await apiRequest<Transaction[]>("/api/transactions"));
    } catch (error) {
      console.error("家計簿データの読み込みに失敗しました", error);
    }
  };

  const loadPlanning = async () => {
    try {
      const [budgetData, fixedData, goalData] = await Promise.all([
        apiRequest<Budget>(`/api/budgets/${month}`),
        apiRequest<FixedExpense[]>("/api/fixed-expenses"),
        apiRequest<SavingGoal[]>("/api/saving-goals"),
      ]);
      setBudget(budgetData);
      setBudgetInput(budgetData.amount ? String(budgetData.amount) : "");
      setFixedExpenses(fixedData);
      setSavingGoals(goalData);
    } catch (error) {
      console.error("家計プランデータの読み込みに失敗しました", error);
    }
  };

  useEffect(() => {
    void loadTransactions();
  }, []);

  useEffect(() => {
    void loadPlanning();
  }, [month]);

  const changeType = (nextType: TransactionType) => {
    setType(nextType);
    setCategory(categories[nextType][0]);
  };

  const addTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numberAmount = Number(amount);
    if (!numberAmount || numberAmount <= 0 || !date) return;

    try {
      const newTransaction = {
        type,
        amount: numberAmount,
        category,
        date,
        memo: memo.trim(),
      };

      if (editingId !== null) {
        await apiRequest<Transaction>(`/api/transactions/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(newTransaction),
        });
        setEditingId(null);
      } else {
        await apiRequest<Transaction>("/api/transactions", {
          method: "POST",
          body: JSON.stringify(newTransaction),
        });
      }

      setAmount("");
      setMemo("");
      await loadTransactions();
    } catch (error) {
      console.error("取引の追加・更新に失敗しました", error);
    }
  };

  const deleteTransaction = async (id: number) => {
    if (!window.confirm("本当に削除しますか？")) return;

    try {
      await apiRequest<void>(`/api/transactions/${id}`, { method: "DELETE" });
      await loadTransactions();
    } catch (error) {
      console.error("取引の削除に失敗しました", error);
    }
  };

  const startEditing = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setDate(transaction.date);
    setMemo(transaction.memo);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setType("expense");
    setAmount("");
    setCategory(categories.expense[0]);
    setDate(new Date().toISOString().slice(0, 10));
    setMemo("");
  };

  const monthlyTransactions = transactions
    .filter((transaction) => transaction.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));

  const income = monthlyTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const expense = monthlyTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const expenseByCategory = categories.expense
    .map((name) => ({
      name,
      amount: monthlyTransactions
        .filter((transaction) => transaction.type === "expense" && transaction.category === name)
        .reduce((total, transaction) => total + transaction.amount, 0),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const incomeByCategory = categories.income
    .map((name) => ({
      name,
      amount: monthlyTransactions
        .filter((transaction) => transaction.type === "income" && transaction.category === name)
        .reduce((total, transaction) => total + transaction.amount, 0),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const saveBudget = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(budgetInput);
    if (amount < 0) return;

    try {
      const saved = await apiRequest<Budget>(`/api/budgets/${month}`, {
        method: "PUT",
        body: JSON.stringify({ amount }),
      });
      setBudget(saved);
    } catch (error) {
      console.error("予算の保存に失敗しました", error);
    }
  };

  const addFixedExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(fixedAmount);
    const dueDay = Number(fixedDueDay);
    if (!fixedName.trim() || amount <= 0 || dueDay < 1 || dueDay > 31) return;

    try {
      await apiRequest<FixedExpense>("/api/fixed-expenses", {
        method: "POST",
        body: JSON.stringify({ name: fixedName.trim(), amount, category: fixedCategory, dueDay, active: true }),
      });
      setFixedName("");
      setFixedAmount("");
      await loadPlanning();
    } catch (error) {
      console.error("固定費の登録に失敗しました", error);
    }
  };

  const toggleFixedExpense = async (fixedExpense: FixedExpense) => {
    try {
      await apiRequest<FixedExpense>(`/api/fixed-expenses/${fixedExpense.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !fixedExpense.active }),
      });
      await loadPlanning();
    } catch (error) {
      console.error("固定費の更新に失敗しました", error);
    }
  };

  const deleteFixedExpense = async (id: number) => {
    try {
      await apiRequest<void>(`/api/fixed-expenses/${id}`, { method: "DELETE" });
      await loadPlanning();
    } catch (error) {
      console.error("固定費の削除に失敗しました", error);
    }
  };

  const addSavingGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetAmount = Number(goalTarget);
    const savedAmount = Number(goalSaved || 0);
    if (!goalName.trim() || targetAmount <= 0 || savedAmount < 0) return;

    try {
      await apiRequest<SavingGoal>("/api/saving-goals", {
        method: "POST",
        body: JSON.stringify({ name: goalName.trim(), targetAmount, savedAmount, targetDate: goalDate }),
      });
      setGoalName("");
      setGoalTarget("");
      setGoalSaved("");
      setGoalDate("");
      await loadPlanning();
    } catch (error) {
      console.error("貯金目標の登録に失敗しました", error);
    }
  };

  const deleteSavingGoal = async (id: number) => {
    try {
      await apiRequest<void>(`/api/saving-goals/${id}`, { method: "DELETE" });
      await loadPlanning();
    } catch (error) {
      console.error("貯金目標の削除に失敗しました", error);
    }
  };

  return (
    <main className="container">
      <h1>💰 家計簿</h1>

      <section className="card">
        <h2>{editingId === null ? "取引を追加" : "取引を編集"}</h2>

        <form onSubmit={addTransaction}>
          <select
            value={type}
            onChange={(event) => changeType(event.target.value as TransactionType)}
            aria-label="収支の種類"
          >
            <option value="expense">支出</option>
            <option value="income">収入</option>
          </select>

          <input
            type="number"
            min="1"
            placeholder="金額"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="カテゴリー"
          >
            {categories[type].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />

          <input
            type="text"
            placeholder="メモ（任意）"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />

          <button type="submit">{editingId === null ? "追加" : "更新"}</button>
          {editingId !== null && (
            <button type="button" className="secondary-button" onClick={cancelEditing}>キャンセル</button>
          )}
        </form>
      </section>

      <section className="card">
        <label htmlFor="month"><h2>月を選択</h2></label>
        <input
          id="month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />

        <div className="money-summary">
          <div><span>収入</span><strong>¥{income.toLocaleString()}</strong></div>
          <div><span>支出</span><strong>¥{expense.toLocaleString()}</strong></div>
          <div><span>残高</span><strong>¥{(income - expense).toLocaleString()}</strong></div>
        </div>

        <div className="category-summary">
          <div>
            <h3>支出の内訳</h3>
            {expenseByCategory.length === 0 ? (
              <p>データがありません</p>
            ) : expenseByCategory.map((item) => (
              <div className="category-row" key={item.name}>
                <span>{item.name}</span>
                <strong>¥{item.amount.toLocaleString()}</strong>
              </div>
            ))}
          </div>

          <div>
            <h3>収入の内訳</h3>
            {incomeByCategory.length === 0 ? (
              <p>データがありません</p>
            ) : incomeByCategory.map((item) => (
              <div className="category-row" key={item.name}>
                <span>{item.name}</span>
                <strong>¥{item.amount.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>月間予算</h2>
        <form onSubmit={saveBudget} className="money-plan-form">
          <input type="number" min="0" placeholder="予算額" value={budgetInput} onChange={(event) => setBudgetInput(event.target.value)} />
          <button type="submit">予算を保存</button>
        </form>
        <div className="budget-progress">
          <div><span>予算残額</span><strong>¥{Math.max(budget.amount - expense, 0).toLocaleString()}</strong></div>
          <div className="budget-bar"><span style={{ width: `${budget.amount > 0 ? Math.min((expense / budget.amount) * 100, 100) : 0}%` }} /></div>
        </div>
      </section>

      <section className="card">
        <h2>支出のグラフ</h2>
        {expenseByCategory.length === 0 ? <p>支出データがありません</p> : (
          <div className="expense-chart">
            {expenseByCategory.map((item) => {
              const maxAmount = expenseByCategory[0]?.amount || 1;
              return (
                <div className="expense-chart-row" key={item.name}>
                  <span>{item.name}</span>
                  <div className="expense-chart-track"><span style={{ width: `${(item.amount / maxAmount) * 100}%` }} /></div>
                  <strong>¥{item.amount.toLocaleString()}</strong>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <h2>固定費</h2>
        <form onSubmit={addFixedExpense} className="planning-form">
          <input type="text" placeholder="固定費名" value={fixedName} onChange={(event) => setFixedName(event.target.value)} />
          <input type="number" min="1" placeholder="金額" value={fixedAmount} onChange={(event) => setFixedAmount(event.target.value)} />
          <select value={fixedCategory} onChange={(event) => setFixedCategory(event.target.value)}>
            {categories.expense.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input type="number" min="1" max="31" placeholder="支払日" value={fixedDueDay} onChange={(event) => setFixedDueDay(event.target.value)} />
          <button type="submit">固定費を追加</button>
        </form>
        {fixedExpenses.length === 0 ? <p>固定費はありません</p> : fixedExpenses.map((item) => (
          <div className="planning-row" key={item.id}>
            <label><input type="checkbox" checked={item.active} onChange={() => toggleFixedExpense(item)} /> {item.name}</label>
            <span>{item.category} ・ 毎月{item.dueDay}日</span>
            <strong>¥{item.amount.toLocaleString()}</strong>
            <button type="button" className="delete-button" onClick={() => deleteFixedExpense(item.id)}>削除</button>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>貯金目標</h2>
        <form onSubmit={addSavingGoal} className="planning-form">
          <input type="text" placeholder="目標名" value={goalName} onChange={(event) => setGoalName(event.target.value)} />
          <input type="number" min="1" placeholder="目標金額" value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)} />
          <input type="number" min="0" placeholder="現在の貯金" value={goalSaved} onChange={(event) => setGoalSaved(event.target.value)} />
          <input type="date" value={goalDate} onChange={(event) => setGoalDate(event.target.value)} />
          <button type="submit">目標を追加</button>
        </form>
        {savingGoals.length === 0 ? <p>貯金目標はありません</p> : savingGoals.map((goal) => {
          const rate = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
          return (
            <div className="saving-goal" key={goal.id}>
              <div><strong>{goal.name}</strong><span>¥{goal.savedAmount.toLocaleString()} / ¥{goal.targetAmount.toLocaleString()}</span></div>
              {goal.targetDate && <small>目標日 {goal.targetDate}</small>}
              <div className="saving-progress"><span style={{ width: `${rate}%` }} /></div>
              <button type="button" className="delete-button" onClick={() => deleteSavingGoal(goal.id)}>削除</button>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2>取引一覧</h2>

        {monthlyTransactions.length === 0 ? (
          <p>取引はありません</p>
        ) : (
          <ul className="transaction-list">
            {monthlyTransactions.map((transaction) => (
              <li className="item-card" key={transaction.id}>
                <div className="transaction-row">
                  <div>
                    <strong>{transaction.category}</strong>
                    <small>{transaction.date}{transaction.memo ? ` ・ ${transaction.memo}` : ""}</small>
                  </div>
                  <strong className={transaction.type === "income" ? "income-text" : "expense-text"}>
                    {transaction.type === "income" ? "+" : "-"}¥{transaction.amount.toLocaleString()}
                  </strong>
                  <div className="item-actions">
                    <button type="button" className="edit-button" onClick={() => startEditing(transaction)}>編集</button>
                    <button type="button" className="delete-button" onClick={() => deleteTransaction(transaction.id)}>削除</button>
                  </div>
                </div>

                {editingId === transaction.id && (
                  <form className="inline-editor" onSubmit={addTransaction}>
                    <div className="inline-editor-fields">
                      <select value={type} onChange={(event) => changeType(event.target.value as TransactionType)} aria-label="収支の種類">
                        <option value="expense">支出</option>
                        <option value="income">収入</option>
                      </select>
                      <input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="金額" />
                    </div>
                    <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="カテゴリー">
                      {categories[type].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="取引日" />
                    <input type="text" value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="メモ（任意）" />
                    <div className="inline-editor-actions">
                      <button type="submit">保存</button>
                      <button type="button" className="secondary-button" onClick={cancelEditing}>キャンセル</button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
