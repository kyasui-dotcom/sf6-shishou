import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";
import { adminMiddleware } from "../middleware/admin";

const frameData = new Hono<Env>();

// Public: Get frame data for a character
frameData.get("/", async (c) => {
  const character = c.req.query("character");
  if (!character) {
    return c.json({ error: "characterは必須です" }, 400);
  }

  const category = c.req.query("category");
  const search = c.req.query("search");

  let query = "SELECT * FROM frame_data WHERE character = ?";
  const params: string[] = [character];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }
  if (search) {
    query += " AND (move_name LIKE ? OR move_name_jp LIKE ? OR input LIKE ? OR notes LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  query += " ORDER BY sort_order ASC, created_at ASC";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json((results || []).map((row) => ({
    id: row.id,
    character: row.character,
    moveName: row.move_name,
    moveNameJp: row.move_name_jp,
    input: row.input,
    category: row.category,
    startup: row.startup,
    active: row.active,
    recovery: row.recovery,
    onBlock: row.on_block,
    onHit: row.on_hit,
    damage: row.damage,
    guard: row.guard,
    cancelInto: row.cancel_into,
    notes: row.notes,
    sortOrder: row.sort_order,
  })));
});

// Public: Get characters that have frame data
frameData.get("/characters", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT DISTINCT character FROM frame_data ORDER BY character ASC"
  ).all();
  return c.json((results || []).map((r) => r.character));
});

// Admin: Create a move
frameData.post("/", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO frame_data (id, character, move_name, move_name_jp, input, category, startup, active, recovery, on_block, on_hit, damage, guard, cancel_into, notes, sort_order, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.character, body.moveName, body.moveNameJp || "",
    body.input || "", body.category || "normal",
    body.startup ?? null, body.active ?? null, body.recovery ?? null,
    body.onBlock ?? null, body.onHit ?? null, body.damage ?? null,
    body.guard || "", body.cancelInto || "", body.notes || "",
    body.sortOrder || 0, userId
  ).run();

  return c.json({ id, success: true }, 201);
});

// Admin: Update a move
frameData.put("/:id", authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const body = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT id FROM frame_data WHERE id = ?"
  ).bind(id).first();
  if (!existing) {
    return c.json({ error: "技が見つかりません" }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE frame_data SET character = ?, move_name = ?, move_name_jp = ?, input = ?, category = ?,
     startup = ?, active = ?, recovery = ?, on_block = ?, on_hit = ?, damage = ?,
     guard = ?, cancel_into = ?, notes = ?, sort_order = ?, updated_by = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    body.character, body.moveName, body.moveNameJp || "",
    body.input || "", body.category || "normal",
    body.startup ?? null, body.active ?? null, body.recovery ?? null,
    body.onBlock ?? null, body.onHit ?? null, body.damage ?? null,
    body.guard || "", body.cancelInto || "", body.notes || "",
    body.sortOrder || 0, userId, id
  ).run();

  return c.json({ success: true });
});

// Admin: Delete a move
frameData.delete("/:id", authMiddleware, adminMiddleware, async (c) => {
  const id = c.req.param("id");

  const res = await c.env.DB.prepare(
    "DELETE FROM frame_data WHERE id = ?"
  ).bind(id).run();

  if (!res.meta.changes) {
    return c.json({ error: "技が見つかりません" }, 404);
  }

  return c.json({ success: true });
});

// Admin: Bulk import moves
frameData.post("/bulk", authMiddleware, adminMiddleware, async (c) => {
  const userId = c.get("userId");
  const { character, moves } = await c.req.json();

  if (!character || !Array.isArray(moves) || moves.length === 0) {
    return c.json({ error: "characterとmoves配列は必須です" }, 400);
  }

  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < moves.length; i += batchSize) {
    const batch = moves.slice(i, i + batchSize);
    const stmts = batch.map((m: any, idx: number) =>
      c.env.DB.prepare(
        `INSERT OR REPLACE INTO frame_data (id, character, move_name, move_name_jp, input, category, startup, active, recovery, on_block, on_hit, damage, guard, cancel_into, notes, sort_order, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        m.id || crypto.randomUUID(), character, m.moveName, m.moveNameJp || "",
        m.input || "", m.category || "normal",
        m.startup ?? null, m.active ?? null, m.recovery ?? null,
        m.onBlock ?? null, m.onHit ?? null, m.damage ?? null,
        m.guard || "", m.cancelInto || "", m.notes || "",
        m.sortOrder ?? (i + idx), userId
      )
    );
    await c.env.DB.batch(stmts);
    imported += batch.length;
  }

  return c.json({ success: true, imported });
});

export default frameData;
