import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const app = new Hono<Env>();

// Get user's setplays (with optional character filter)
app.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const character = c.req.query("character");

  let query = "SELECT * FROM setplays WHERE user_id = ?";
  const params: string[] = [userId];

  if (character) {
    query += " AND character = ?";
    params.push(character);
  }

  query += " ORDER BY updated_at DESC";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(
    (results || []).map((r: any) => ({
      id: r.id,
      character: r.character,
      name: r.name,
      situation: r.situation,
      tree: JSON.parse(r.tree || "{}"),
      isPublic: !!r.is_public,
      updatedAt: r.updated_at,
      createdAt: r.created_at,
    }))
  );
});

// Get a single setplay
app.get("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const r: any = await c.env.DB.prepare(
    "SELECT * FROM setplays WHERE id = ? AND (user_id = ? OR is_public = 1)"
  ).bind(id, userId).first();

  if (!r) return c.json({ error: "Not found" }, 404);

  return c.json({
    id: r.id,
    character: r.character,
    name: r.name,
    situation: r.situation,
    tree: JSON.parse(r.tree || "{}"),
    isPublic: !!r.is_public,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
  });
});

// Create setplay
app.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    "INSERT INTO setplays (id, user_id, character, name, situation, tree, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id,
    userId,
    body.character || "",
    body.name || "",
    body.situation || "",
    JSON.stringify(body.tree || {}),
    body.isPublic ? 1 : 0
  ).run();

  return c.json({ id, success: true }, 201);
});

// Update setplay
app.put("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing: any = await c.env.DB.prepare(
    "SELECT id FROM setplays WHERE id = ? AND user_id = ?"
  ).bind(id, userId).first();

  if (!existing) return c.json({ error: "Not found" }, 404);

  await c.env.DB.prepare(
    "UPDATE setplays SET name = ?, situation = ?, tree = ?, is_public = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(
    body.name || "",
    body.situation || "",
    JSON.stringify(body.tree || {}),
    body.isPublic ? 1 : 0,
    id
  ).run();

  return c.json({ success: true });
});

// Delete setplay
app.delete("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const existing: any = await c.env.DB.prepare(
    "SELECT id FROM setplays WHERE id = ? AND user_id = ?"
  ).bind(id, userId).first();

  if (!existing) return c.json({ error: "Not found" }, 404);

  await c.env.DB.prepare("DELETE FROM setplays WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

export default app;
