import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const combos = new Hono<Env>();

combos.use("/*", authMiddleware);

// List combos (optionally filtered by character)
combos.get("/", async (c) => {
  const userId = c.get("userId");
  const char = c.req.query("character");
  const controlType = c.req.query("controlType");

  let query = "SELECT * FROM combo_memos WHERE user_id = ?";
  const params: string[] = [userId];

  if (char) {
    query += " AND character = ?";
    params.push(char);
  }
  if (controlType) {
    query += " AND control_type = ?";
    params.push(controlType);
  }

  query += " ORDER BY sort_order ASC, created_at ASC";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json((results || []).map((row) => ({
    id: row.id,
    character: row.character,
    name: row.name,
    command: row.command,
    damage: row.damage,
    memo: row.memo,
    videoUrl: row.video_url || null,
    controlType: row.control_type || "classic",
    isPublic: row.is_public === 1,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  })));
});

// Create combo
combos.post("/", async (c) => {
  const userId = c.get("userId");
  const { character, name, command, damage, memo, videoUrl, isPublic, controlType } = await c.req.json();

  if (!character) {
    return c.json({ error: "characterは必須です" }, 400);
  }

  const id = crypto.randomUUID();
  const last = await c.env.DB.prepare(
    "SELECT MAX(sort_order) as maxOrder FROM combo_memos WHERE user_id = ? AND character = ?"
  ).bind(userId, character).first();
  const sortOrder = ((last?.maxOrder as number) || 0) + 1;
  const publicFlag = isPublic === false ? 0 : 1;
  const ctrlType = controlType === "modern" ? "modern" : "classic";

  await c.env.DB.prepare(
    "INSERT INTO combo_memos (id, user_id, character, name, command, damage, memo, video_url, sort_order, is_public, control_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, userId, character, name || "", command || "", damage || null, memo || "", videoUrl || null, sortOrder, publicFlag, ctrlType).run();

  return c.json({ id, success: true }, 201);
});

// Update combo
combos.put("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const { name, command, damage, memo, videoUrl, isPublic, controlType } = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT id FROM combo_memos WHERE id = ? AND user_id = ?"
  ).bind(id, userId).first();

  if (!existing) {
    return c.json({ error: "コンボが見つかりません" }, 404);
  }

  const publicFlag = isPublic === false ? 0 : 1;
  const ctrlType = controlType === "modern" ? "modern" : "classic";

  await c.env.DB.prepare(
    "UPDATE combo_memos SET name = ?, command = ?, damage = ?, memo = ?, video_url = ?, is_public = ?, control_type = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(name ?? "", command ?? "", damage ?? null, memo ?? "", videoUrl ?? null, publicFlag, ctrlType, id).run();

  return c.json({ success: true });
});

// Delete combo
combos.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const res = await c.env.DB.prepare(
    "DELETE FROM combo_memos WHERE id = ? AND user_id = ?"
  ).bind(id, userId).run();

  if (!res.meta.changes) {
    return c.json({ error: "コンボが見つかりません" }, 404);
  }

  return c.json({ success: true });
});

export default combos;
