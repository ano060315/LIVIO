import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & { userId?: number };

export function requireAuth(request: AuthRequest, response: Response, next: NextFunction) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ error: "認証が必要です" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || "livio-development-secret";
    const payload = jwt.verify(authorization.slice(7), secret) as { userId: number };
    request.userId = payload.userId;
    next();
  } catch {
    response.status(401).json({ error: "ログイン期限切れまたは無効な認証です" });
  }
}
