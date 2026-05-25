import { Context, Next } from "hono";
import { Env } from "./auth";

const ADMIN_USER_IDS = ["d4f504af-75c0-402b-aa53-9d6cb63216ab"];

export function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

export async function adminMiddleware(c: Context<Env>, next: Next) {
  const userId = c.get("userId");
  if (!isAdmin(userId)) {
    return c.json({ error: "管理者権限が必要です" }, 403);
  }
  await next();
}
