import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

async function body(request: NextRequest) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function userId(request: NextRequest): number | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  try {
    const payload = jwt.verify(
      authorization.slice(7),
      process.env.JWT_SECRET || "livio-development-secret",
    ) as { userId: number };
    return payload.userId;
  } catch {
    return null;
  }
}

function authUser(request: NextRequest) {
  const id = userId(request);
  if (!id) return null;
  return id;
}

async function handler(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/^\/api/, "");
  const method = request.method;
  const segments = path.split("/").filter(Boolean);
  const data = method === "GET" || method === "DELETE" ? {} : await body(request);

  try {
    if (path === "/health" && method === "GET") return json({ status: "ok" });

    if (path === "/auth/register" && method === "POST") {
      const name = String(data.name || "").trim();
      const email = String(data.email || "").trim().toLowerCase();
      const password = String(data.password || "");
      if (!name || !email || password.length < 6) {
        return json({ error: "名前・メールアドレス・6文字以上のパスワードが必要です" }, 400);
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return json({ error: "このメールアドレスは既に登録されています" }, 409);

      const user = await prisma.user.create({
        data: { name, email, password: await bcrypt.hash(password, 12) },
      });
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "livio-development-secret", { expiresIn: "7d" });
      return json({ token, user: { id: user.id, name: user.name, email: user.email } }, 201);
    }

    if (path === "/auth/login" && method === "POST") {
      const email = String(data.email || "").trim().toLowerCase();
      const password = String(data.password || "");
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return json({ error: "メールアドレスまたはパスワードが正しくありません" }, 401);
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "livio-development-secret", { expiresIn: "7d" });
      return json({ token, user: { id: user.id, name: user.name, email: user.email } });
    }

    if (path === "/auth/me" && method === "GET") {
      const id = authUser(request);
      if (!id) return json({ error: "認証が必要です" }, 401);
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
      return user ? json({ user }) : json({ error: "ユーザーが見つかりません" }, 404);
    }

    const id = authUser(request);
    if (!id) return json({ error: "認証が必要です" }, 401);

    if (path === "/user/data" && method === "DELETE") {
      await prisma.$transaction([
        prisma.schedule.deleteMany({ where: { userId: id } }),
        prisma.task.deleteMany({ where: { userId: id } }),
        prisma.transaction.deleteMany({ where: { userId: id } }),
        prisma.memo.deleteMany({ where: { userId: id } }),
        prisma.budget.deleteMany({ where: { userId: id } }),
        prisma.fixedExpense.deleteMany({ where: { userId: id } }),
        prisma.savingGoal.deleteMany({ where: { userId: id } }),
        prisma.habit.deleteMany({ where: { userId: id } }),
      ]);
      return new NextResponse(null, { status: 204 });
    }

    if (segments[0] === "schedules") {
      if (segments.length === 1 && method === "GET") {
        return json(await prisma.schedule.findMany({ where: { userId: id }, orderBy: [{ date: "asc" }, { time: "asc" }] }));
      }
      if (segments.length === 1 && method === "POST") {
        return json(await prisma.schedule.create({ data: { ...data, userId: id } as never }), 201);
      }
      if (segments.length === 2) {
        const itemId = Number(segments[1]);
        if (method === "PUT") {
          const result = await prisma.schedule.updateMany({ where: { id: itemId, userId: id }, data });
          return result.count ? json(await prisma.schedule.findUnique({ where: { id: itemId } })) : json({ error: "予定が見つかりません" }, 404);
        }
        if (method === "DELETE") {
          await prisma.schedule.deleteMany({ where: { id: itemId, userId: id } });
          return new NextResponse(null, { status: 204 });
        }
      }
    }

    if (segments[0] === "tasks") {
      if (segments.length === 1 && method === "GET") {
        return json(await prisma.task.findMany({ where: { userId: id }, orderBy: { id: "desc" } }));
      }
      if (segments.length === 1 && method === "POST") {
        return json(await prisma.task.create({ data: { ...data, userId: id } as never }), 201);
      }
      if (segments.length === 2) {
        const itemId = Number(segments[1]);
        if (method === "PUT") {
          const result = await prisma.task.updateMany({ where: { id: itemId, userId: id }, data });
          return result.count ? json(await prisma.task.findUnique({ where: { id: itemId } })) : json({ error: "タスクが見つかりません" }, 404);
        }
        if (method === "DELETE") {
          await prisma.task.deleteMany({ where: { id: itemId, userId: id } });
          return new NextResponse(null, { status: 204 });
        }
      }
    }

    if (segments[0] === "transactions") {
      if (segments.length === 1 && method === "GET") {
        return json(await prisma.transaction.findMany({ where: { userId: id }, orderBy: { date: "desc" } }));
      }
      if (segments.length === 1 && method === "POST") {
        return json(await prisma.transaction.create({ data: { ...data, userId: id } as never }), 201);
      }
      if (segments.length === 2) {
        const itemId = Number(segments[1]);
        if (method === "PUT") {
          const result = await prisma.transaction.updateMany({ where: { id: itemId, userId: id }, data });
          return result.count ? json(await prisma.transaction.findUnique({ where: { id: itemId } })) : json({ error: "取引が見つかりません" }, 404);
        }
        if (method === "DELETE") {
          await prisma.transaction.deleteMany({ where: { id: itemId, userId: id } });
          return new NextResponse(null, { status: 204 });
        }
      }
    }

    if (segments[0] === "memos") {
      if (segments.length === 1 && method === "GET") {
        return json(await prisma.memo.findMany({ where: { userId: id }, orderBy: { updatedAt: "desc" } }));
      }
      if (segments.length === 1 && method === "POST") {
        return json(await prisma.memo.create({ data: { ...data, userId: id } as never }), 201);
      }
      if (segments.length === 2) {
        const itemId = Number(segments[1]);
        if (method === "PUT") {
          const result = await prisma.memo.updateMany({ where: { id: itemId, userId: id }, data });
          return result.count ? json(await prisma.memo.findUnique({ where: { id: itemId } })) : json({ error: "メモが見つかりません" }, 404);
        }
        if (method === "DELETE") {
          await prisma.memo.deleteMany({ where: { id: itemId, userId: id } });
          return new NextResponse(null, { status: 204 });
        }
      }
    }

    if (segments[0] === "habits") {
      if (segments.length === 1 && method === "GET") {
        return json(await prisma.habit.findMany({ where: { userId: id }, include: { records: { orderBy: { date: "desc" } } }, orderBy: { id: "desc" } }));
      }
      if (segments.length === 1 && method === "POST") {
        return json(await prisma.habit.create({ data: { ...data, userId: id } as never }), 201);
      }
      if (segments.length === 2) {
        const itemId = Number(segments[1]);
        if (method === "PUT") {
          await prisma.habit.updateMany({ where: { id: itemId, userId: id }, data });
          return json(await prisma.habit.findUnique({ where: { id: itemId }, include: { records: true } }));
        }
        if (method === "DELETE") {
          await prisma.habit.deleteMany({ where: { id: itemId, userId: id } });
          return new NextResponse(null, { status: 204 });
        }
      }
      if (segments.length === 4 && segments[2] === "records") {
        const itemId = Number(segments[1]);
        const date = segments[3];
        if (method === "PUT") {
          const record = await prisma.habitRecord.upsert({
            where: { habitId_date: { habitId: itemId, date } },
            update: { completed: true },
            create: { habitId: itemId, date, completed: true },
          });
          return json(record);
        }
        if (method === "DELETE") {
          await prisma.habitRecord.deleteMany({ where: { habitId: itemId, date } });
          return new NextResponse(null, { status: 204 });
        }
      }
    }

    if (segments[0] === "budgets" && segments.length === 2) {
      const month = segments[1];
      if (method === "GET") {
        const budget = await prisma.budget.findUnique({ where: { month_userId: { month, userId: id } } });
        return json(budget || { month, amount: 0 });
      }
      if (method === "PUT") {
        return json(await prisma.budget.upsert({
          where: { month_userId: { month, userId: id } },
          update: { amount: Number(data.amount) },
          create: { month, amount: Number(data.amount), userId: id },
        }));
      }
    }

    if (segments[0] === "fixed-expenses") {
      if (segments.length === 1 && method === "GET") {
        return json(await prisma.fixedExpense.findMany({ where: { userId: id }, orderBy: { dueDay: "asc" } }));
      }
      if (segments.length === 1 && method === "POST") {
        return json(await prisma.fixedExpense.create({ data: { ...data, userId: id } as never }), 201);
      }
      if (segments.length === 2) {
        const itemId = Number(segments[1]);
        if (method === "PUT") {
          await prisma.fixedExpense.updateMany({ where: { id: itemId, userId: id }, data });
          return json(await prisma.fixedExpense.findUnique({ where: { id: itemId } }));
        }
        if (method === "DELETE") {
          await prisma.fixedExpense.deleteMany({ where: { id: itemId, userId: id } });
          return new NextResponse(null, { status: 204 });
        }
      }
    }

    if (segments[0] === "saving-goals") {
      if (segments.length === 1 && method === "GET") {
        return json(await prisma.savingGoal.findMany({ where: { userId: id }, orderBy: { targetDate: "asc" } }));
      }
      if (segments.length === 1 && method === "POST") {
        return json(await prisma.savingGoal.create({ data: { ...data, userId: id } as never }), 201);
      }
      if (segments.length === 2) {
        const itemId = Number(segments[1]);
        if (method === "PUT") {
          await prisma.savingGoal.updateMany({ where: { id: itemId, userId: id }, data });
          return json(await prisma.savingGoal.findUnique({ where: { id: itemId } }));
        }
        if (method === "DELETE") {
          await prisma.savingGoal.deleteMany({ where: { id: itemId, userId: id } });
          return new NextResponse(null, { status: 204 });
        }
      }
    }

    return json({ error: "API route not found" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "サーバーエラーが発生しました" }, 500);
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
