import { Context, Next } from "hono";
import * as jose from "jose";

export type Env = {
  Bindings: {
    DB: D1Database;
    CORS_ORIGIN: string;
    JWT_SECRET: string;
    ANTHROPIC_API_KEY: string;
  };
  Variables: {
    userId: string;
  };
};

const getJwtSecret = (secret: string) =>
  new TextEncoder().encode(secret || "dev-secret-change-me");

export async function createToken(userId: string, secret: string): Promise<string> {
  return new jose.SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getJwtSecret(secret));
}

export async function authMiddleware(c: Context<Env>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret(c.env.JWT_SECRET));
    if (!payload.sub) {
      return c.json({ error: "無効なトークン" }, 401);
    }
    c.set("userId", payload.sub);
    await next();
  } catch {
    return c.json({ error: "トークンが期限切れです" }, 401);
  }
}
