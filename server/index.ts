import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth, type AuthRequest } from "./auth";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/schedules", requireAuth, async (request: AuthRequest, response) => {
  response.json(await prisma.schedule.findMany({
    where: { userId: request.userId },
    orderBy: { date: "asc" },
  }));
});

app.post("/api/schedules", requireAuth, async (request: AuthRequest, response) => {
  const schedule = await prisma.schedule.create({
    data: { ...request.body, userId: request.userId },
  });
  response.status(201).json(schedule);
});

app.put("/api/schedules/:id", requireAuth, async (request: AuthRequest, response) => {
  const schedule = await prisma.schedule.updateMany({
    where: { id: Number(request.params.id), userId: request.userId },
    data: request.body,
  });
  if (schedule.count === 0) {
    response.status(404).json({ error: "予定が見つかりません" });
    return;
  }
  response.json(await prisma.schedule.findUnique({ where: { id: Number(request.params.id) } }));
});

app.delete("/api/schedules/:id", requireAuth, async (request: AuthRequest, response) => {
  await prisma.schedule.deleteMany({
    where: { id: Number(request.params.id), userId: request.userId },
  });
  response.status(204).end();
});

app.get("/api/tasks", requireAuth, async (request: AuthRequest, response) => {
  response.json(await prisma.task.findMany({
    where: { userId: request.userId },
    orderBy: { id: "desc" },
  }));
});

app.post("/api/tasks", requireAuth, async (request: AuthRequest, response) => {
  response.status(201).json(await prisma.task.create({
    data: { ...request.body, userId: request.userId },
  }));
});

app.put("/api/tasks/:id", requireAuth, async (request: AuthRequest, response) => {
  const result = await prisma.task.updateMany({
    where: { id: Number(request.params.id), userId: request.userId },
    data: request.body,
  });
  if (result.count === 0) {
    response.status(404).json({ error: "タスクが見つかりません" });
    return;
  }
  response.json(await prisma.task.findUnique({ where: { id: Number(request.params.id) } }));
});

app.delete("/api/tasks/:id", requireAuth, async (request: AuthRequest, response) => {
  await prisma.task.deleteMany({
    where: { id: Number(request.params.id), userId: request.userId },
  });
  response.status(204).end();
});

app.get("/api/transactions", requireAuth, async (request: AuthRequest, response) => {
  response.json(await prisma.transaction.findMany({
    where: { userId: request.userId },
    orderBy: { date: "desc" },
  }));
});

app.post("/api/transactions", requireAuth, async (request: AuthRequest, response) => {
  response.status(201).json(await prisma.transaction.create({
    data: { ...request.body, userId: request.userId },
  }));
});

app.put("/api/transactions/:id", requireAuth, async (request: AuthRequest, response) => {
  const result = await prisma.transaction.updateMany({
    where: { id: Number(request.params.id), userId: request.userId },
    data: request.body,
  });
  if (result.count === 0) {
    response.status(404).json({ error: "取引が見つかりません" });
    return;
  }
  response.json(await prisma.transaction.findUnique({ where: { id: Number(request.params.id) } }));
});

app.delete("/api/transactions/:id", requireAuth, async (request: AuthRequest, response) => {
  await prisma.transaction.deleteMany({
    where: { id: Number(request.params.id), userId: request.userId },
  });
  response.status(204).end();
});

app.get("/api/memos", requireAuth, async (request: AuthRequest, response) => {
  response.json(await prisma.memo.findMany({
    where: { userId: request.userId },
    orderBy: { updatedAt: "desc" },
  }));
});

app.post("/api/memos", requireAuth, async (request: AuthRequest, response) => {
  response.status(201).json(await prisma.memo.create({
    data: { ...request.body, userId: request.userId },
  }));
});

app.put("/api/memos/:id", requireAuth, async (request: AuthRequest, response) => {
  const result = await prisma.memo.updateMany({
    where: { id: Number(request.params.id), userId: request.userId },
    data: request.body,
  });
  if (result.count === 0) {
    response.status(404).json({ error: "メモが見つかりません" });
    return;
  }
  response.json(await prisma.memo.findUnique({ where: { id: Number(request.params.id) } }));
});

app.delete("/api/memos/:id", requireAuth, async (request: AuthRequest, response) => {
  await prisma.memo.deleteMany({
    where: { id: Number(request.params.id), userId: request.userId },
  });
  response.status(204).end();
});

app.post("/api/auth/register", async (request, response) => {
  const { name, email, password } = request.body as { name?: string; email?: string; password?: string };

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    response.status(400).json({ error: "名前・メールアドレス・6文字以上のパスワードが必要です" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    response.status(409).json({ error: "このメールアドレスは既に登録されています" });
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: await bcrypt.hash(password, 12),
    },
  });

  const secret = process.env.JWT_SECRET || "livio-development-secret";
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: "7d" });
  response.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/login", async (request, response) => {
  const { email, password } = request.body as { email?: string; password?: string };

  const user = await prisma.user.findUnique({
    where: { email: email?.trim().toLowerCase() },
  });

  if (!user || !password || !(await bcrypt.compare(password, user.password))) {
    response.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
    return;
  }

  const secret = process.env.JWT_SECRET || "livio-development-secret";
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: "7d" });
  response.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get("/api/auth/me", requireAuth, async (request: AuthRequest, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    response.status(404).json({ error: "ユーザーが見つかりません" });
    return;
  }

  response.json({ user });
});

app.delete("/api/user/data", requireAuth, async (request: AuthRequest, response) => {
  await prisma.$transaction([
    prisma.schedule.deleteMany({ where: { userId: request.userId } }),
    prisma.task.deleteMany({ where: { userId: request.userId } }),
    prisma.transaction.deleteMany({ where: { userId: request.userId } }),
    prisma.memo.deleteMany({ where: { userId: request.userId } }),
  ]);

  response.status(204).end();
});

app.get("/api/budgets/:month", requireAuth, async (request: AuthRequest, response) => {
  const month = String(request.params.month);
  const budget = await prisma.budget.findUnique({
    where: { month_userId: { month, userId: request.userId! } },
  });
  response.json(budget || { month, amount: 0 });
});

app.put("/api/budgets/:month", requireAuth, async (request: AuthRequest, response) => {
  const month = String(request.params.month);
  const amount = Number(request.body.amount);
  const budget = await prisma.budget.upsert({
    where: { month_userId: { month, userId: request.userId! } },
    update: { amount },
    create: { month, amount, userId: request.userId! },
  });
  response.json(budget);
});

app.get("/api/fixed-expenses", requireAuth, async (request: AuthRequest, response) => {
  response.json(await prisma.fixedExpense.findMany({
    where: { userId: request.userId },
    orderBy: { dueDay: "asc" },
  }));
});

app.post("/api/fixed-expenses", requireAuth, async (request: AuthRequest, response) => {
  response.status(201).json(await prisma.fixedExpense.create({
    data: { ...request.body, userId: request.userId },
  }));
});

app.put("/api/fixed-expenses/:id", requireAuth, async (request: AuthRequest, response) => {
  const result = await prisma.fixedExpense.updateMany({
    where: { id: Number(request.params.id), userId: request.userId },
    data: request.body,
  });
  if (result.count === 0) {
    response.status(404).json({ error: "固定費が見つかりません" });
    return;
  }
  response.json(await prisma.fixedExpense.findUnique({ where: { id: Number(request.params.id) } }));
});

app.delete("/api/fixed-expenses/:id", requireAuth, async (request: AuthRequest, response) => {
  await prisma.fixedExpense.deleteMany({
    where: { id: Number(request.params.id), userId: request.userId },
  });
  response.status(204).end();
});

app.get("/api/saving-goals", requireAuth, async (request: AuthRequest, response) => {
  response.json(await prisma.savingGoal.findMany({
    where: { userId: request.userId },
    orderBy: { targetDate: "asc" },
  }));
});

app.post("/api/saving-goals", requireAuth, async (request: AuthRequest, response) => {
  response.status(201).json(await prisma.savingGoal.create({
    data: { ...request.body, userId: request.userId },
  }));
});

app.put("/api/saving-goals/:id", requireAuth, async (request: AuthRequest, response) => {
  const result = await prisma.savingGoal.updateMany({
    where: { id: Number(request.params.id), userId: request.userId },
    data: request.body,
  });
  if (result.count === 0) {
    response.status(404).json({ error: "貯金目標が見つかりません" });
    return;
  }
  response.json(await prisma.savingGoal.findUnique({ where: { id: Number(request.params.id) } }));
});

app.delete("/api/saving-goals/:id", requireAuth, async (request: AuthRequest, response) => {
  await prisma.savingGoal.deleteMany({
    where: { id: Number(request.params.id), userId: request.userId },
  });
  response.status(204).end();
});

app.get("/api/habits", requireAuth, async (request: AuthRequest, response) => {
  response.json(await prisma.habit.findMany({
    where: { userId: request.userId },
    include: { records: { orderBy: { date: "desc" } } },
    orderBy: { id: "desc" },
  }));
});

app.post("/api/habits", requireAuth, async (request: AuthRequest, response) => {
  response.status(201).json(await prisma.habit.create({
    data: { ...request.body, userId: request.userId },
  }));
});

app.put("/api/habits/:id", requireAuth, async (request: AuthRequest, response) => {
  const result = await prisma.habit.updateMany({
    where: { id: Number(request.params.id), userId: request.userId },
    data: request.body,
  });
  if (result.count === 0) {
    response.status(404).json({ error: "習慣が見つかりません" });
    return;
  }
  response.json(await prisma.habit.findUnique({
    where: { id: Number(request.params.id) },
    include: { records: { orderBy: { date: "desc" } } },
  }));
});

app.delete("/api/habits/:id", requireAuth, async (request: AuthRequest, response) => {
  await prisma.habit.deleteMany({
    where: { id: Number(request.params.id), userId: request.userId },
  });
  response.status(204).end();
});

app.put("/api/habits/:id/records/:date", requireAuth, async (request: AuthRequest, response) => {
  const habit = await prisma.habit.findFirst({
    where: { id: Number(request.params.id), userId: request.userId },
  });
  if (!habit) {
    response.status(404).json({ error: "習慣が見つかりません" });
    return;
  }

  const record = await prisma.habitRecord.upsert({
    where: {
      habitId_date: {
        habitId: Number(request.params.id),
        date: String(request.params.date),
      },
    },
    update: { completed: true },
    create: {
      habitId: Number(request.params.id),
      date: String(request.params.date),
      completed: true,
    },
  });
  response.json(record);
});

app.delete("/api/habits/:id/records/:date", requireAuth, async (request: AuthRequest, response) => {
  await prisma.habitRecord.deleteMany({
    where: { habitId: Number(request.params.id), date: String(request.params.date) },
  });
  response.status(204).end();
});

app.listen(port, () => {
  console.log(`APIサーバーを起動しました: http://localhost:${port}`);
});
