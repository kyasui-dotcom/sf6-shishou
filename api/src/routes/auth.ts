import { Hono } from "hono";
import { Env, createToken, authMiddleware } from "../middleware/auth";

const auth = new Hono<Env>();

auth.post("/register", async (c) => {
  const { username, email, password, mainCharacter, subCharacters } = await c.req.json();

  if (!username || !email || !password) {
    return c.json({ error: "ユーザー名、メール、パスワードは必須です" }, 400);
  }

  // Simple password hash using Web Crypto API (available in Workers)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "sf6-shishou-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  const id = crypto.randomUUID();

  try {
    await c.env.DB.prepare(
      "INSERT INTO users (id, username, email, password_hash, main_character, sub_characters) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, username, email, passwordHash, mainCharacter || "", JSON.stringify(subCharacters || [])).run();
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) {
      return c.json({ error: "このユーザー名またはメールアドレスは既に使用されています" }, 409);
    }
    throw e;
  }

  const token = await createToken(id, c.env.JWT_SECRET);
  return c.json({ token, user: { id, username, email, mainCharacter: mainCharacter || "", subCharacters: subCharacters || [], plan: "free" } }, 201);
});

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: "メールとパスワードは必須です" }, 400);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password + "sf6-shishou-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  const user = await c.env.DB.prepare(
    "SELECT id, username, email, main_character, sub_characters, plan FROM users WHERE email = ? AND password_hash = ?"
  ).bind(email, passwordHash).first();

  if (!user) {
    return c.json({ error: "メールアドレスまたはパスワードが正しくありません" }, 401);
  }

  const token = await createToken(user.id as string, c.env.JWT_SECRET);
  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      mainCharacter: user.main_character,
      subCharacters: JSON.parse((user.sub_characters as string) || "[]"),
      plan: user.plan || "free",
    },
  });
});

auth.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const user = await c.env.DB.prepare(
    "SELECT id, username, email, main_character, sub_characters, plan FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!user) {
    return c.json({ error: "ユーザーが見つかりません" }, 404);
  }

  return c.json({
    id: user.id,
    username: user.username,
    email: user.email,
    mainCharacter: user.main_character,
    subCharacters: JSON.parse((user.sub_characters as string) || "[]"),
    plan: user.plan || "free",
  });
});

export default auth;
