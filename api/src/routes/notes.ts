import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const notes = new Hono<Env>();

notes.use("/*", authMiddleware);

// List all character notes for user
notes.get("/", async (c) => {
  const userId = c.get("userId");
  const myChar = c.req.query("myCharacter");

  let query = "SELECT * FROM character_notes WHERE user_id = ?";
  const params: string[] = [userId];

  if (myChar) {
    query += " AND my_character = ?";
    params.push(myChar);
  }

  query += " ORDER BY updated_at DESC";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json((results || []).map((row) => ({
    id: row.id,
    myCharacter: row.my_character,
    opponentCharacter: row.opponent_character,
    content: row.content,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  })));
});

// Get specific matchup note
notes.get("/:myChar/:oppChar", async (c) => {
  const userId = c.get("userId");
  const myChar = c.req.param("myChar");
  const oppChar = c.req.param("oppChar");

  const row = await c.env.DB.prepare(
    "SELECT * FROM character_notes WHERE user_id = ? AND my_character = ? AND opponent_character = ?"
  ).bind(userId, myChar, oppChar).first();

  if (!row) {
    return c.json({ myCharacter: myChar, opponentCharacter: oppChar, content: "" });
  }

  return c.json({
    id: row.id,
    myCharacter: row.my_character,
    opponentCharacter: row.opponent_character,
    content: row.content,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  });
});

// Create or update matchup note (upsert)
notes.put("/:myChar/:oppChar", async (c) => {
  const userId = c.get("userId");
  const myChar = c.req.param("myChar");
  const oppChar = c.req.param("oppChar");
  const { content } = await c.req.json<{ content: string }>();

  if (content === undefined) {
    return c.json({ error: "contentは必須です" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM character_notes WHERE user_id = ? AND my_character = ? AND opponent_character = ?"
  ).bind(userId, myChar, oppChar).first();

  if (existing) {
    await c.env.DB.prepare(
      "UPDATE character_notes SET content = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(content, existing.id).run();
    return c.json({ id: existing.id, success: true });
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO character_notes (id, user_id, my_character, opponent_character, content) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, userId, myChar, oppChar, content).run();

  return c.json({ id, success: true }, 201);
});

// Delete matchup note
notes.delete("/:myChar/:oppChar", async (c) => {
  const userId = c.get("userId");
  const myChar = c.req.param("myChar");
  const oppChar = c.req.param("oppChar");

  const res = await c.env.DB.prepare(
    "DELETE FROM character_notes WHERE user_id = ? AND my_character = ? AND opponent_character = ?"
  ).bind(userId, myChar, oppChar).run();

  if (!res.meta.changes) {
    return c.json({ error: "ノートが見つかりません" }, 404);
  }

  return c.json({ success: true });
});

export default notes;
