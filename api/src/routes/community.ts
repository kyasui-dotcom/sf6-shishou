import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const community = new Hono<Env>();

// Community browsing requires auth
community.use("/*", authMiddleware);

// List public memos with filters
community.get("/memos", async (c) => {
  const myChar = c.req.query("myCharacter");
  const opponent = c.req.query("opponent");
  const result = c.req.query("result");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  let query = `
    SELECT m.*, u.username FROM memos m
    JOIN users u ON m.user_id = u.id
    WHERE m.is_public = 1
  `;
  const params: any[] = [];

  if (myChar) {
    query += " AND m.my_character = ?";
    params.push(myChar);
  }
  if (opponent) {
    query += " AND m.opponent_character = ?";
    params.push(opponent);
  }
  if (result === "win" || result === "loss") {
    query += " AND m.result = ?";
    params.push(result);
  }

  query += " ORDER BY m.created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  const memoList = (results || []).map((row: any) => ({
    id: row.id,
    username: row.username,
    myCharacter: row.my_character,
    opponentCharacter: row.opponent_character,
    result: row.result,
    memo: row.memo,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at,
  }));

  return c.json(memoList);
});

export default community;
