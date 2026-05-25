import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";
import { callClaude } from "../lib/claude";

const memos = new Hono<Env>();

memos.use("/*", authMiddleware);

// Parse match result from screenshot
memos.post("/parse-image", async (c) => {
  const userId = c.get("userId");

  const user = await c.env.DB.prepare("SELECT plan FROM users WHERE id = ?").bind(userId).first();
  if (!user || user.plan === "free") {
    return c.json({ error: "写真解析は有料プラン限定機能です。プランをアップグレードしてください。" }, 403);
  }

  const { image } = await c.req.json();

  if (!image) {
    return c.json({ error: "画像データが必要です" }, 400);
  }

  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const text = await callClaude({
      apiKey: c.env.ANTHROPIC_API_KEY,
      maxTokens: 500,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64Data },
          },
          {
            type: "text",
            text: `この画像はストリートファイター6の対戦結果画面です。以下の情報をJSON形式で抽出してください。

- player1: 左側（1P側）のキャラクター名（英語）
- player2: 右側（2P側）のキャラクター名（英語）
- winner: 勝者がどちら側か（"player1" or "player2"）

キャラクター名は以下のいずれかを使用してください:
Ryu, Luke, Ken, Juri, Kimberly, Guile, Chun-Li, Jamie, JP, Marisa, Manon, Dee Jay, Cammy, Lily, Zangief, Dhalsim, Honda, Blanka, Rashid, A.K.I., Ed, Akuma, M. Bison, Terry, Mai, Elena, Gouki

JSONのみ出力してください。対戦結果画面でない場合は {"error": "対戦結果画面ではありません"} を返してください。`,
          },
        ],
      }],
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error) {
      return c.json({ error: parsed.error }, 400);
    }
    return c.json(parsed);
  } catch {
    return c.json({ error: "画像の解析に失敗しました" }, 500);
  }
});

// Create memo
memos.post("/", async (c) => {
  const userId = c.get("userId");
  const { myCharacter, opponentCharacter, result, memo, tags, isPublic, lp, mr } = await c.req.json();

  if (!myCharacter || !opponentCharacter || !result) {
    return c.json({ error: "キャラクターと勝敗は必須です" }, 400);
  }

  if (result !== "win" && result !== "loss") {
    return c.json({ error: "resultはwinまたはlossである必要があります" }, 400);
  }

  const id = crypto.randomUUID();
  const tagsJson = JSON.stringify(tags || []);

  await c.env.DB.prepare(
    `INSERT INTO memos (id, user_id, my_character, opponent_character, result, memo, tags, is_public, lp, mr)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, userId, myCharacter, opponentCharacter, result, memo || "", tagsJson, isPublic ? 1 : 0, lp || null, mr || null).run();

  return c.json({ id, myCharacter, opponentCharacter, result, memo: memo || "", tags: tags || [], isPublic: !!isPublic, lp: lp || null, mr: mr || null }, 201);
});

// List memos (with filters)
memos.get("/", async (c) => {
  const userId = c.get("userId");
  const opponent = c.req.query("opponent");
  const result = c.req.query("result");
  const tag = c.req.query("tag");
  const myChar = c.req.query("myCharacter");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = Math.max(parseInt(c.req.query("offset") || "0"), 0);

  let query = "SELECT * FROM memos WHERE user_id = ?";
  const params: (string | number)[] = [userId];

  if (opponent) {
    query += " AND opponent_character = ?";
    params.push(opponent);
  }
  if (myChar) {
    query += " AND my_character = ?";
    params.push(myChar);
  }
  if (result === "win" || result === "loss") {
    query += " AND result = ?";
    params.push(result);
  }
  if (tag) {
    query += " AND tags LIKE ?";
    params.push(`%${JSON.stringify(tag).slice(1, -1)}%`);
  }
  const search = c.req.query("search");
  if (search) {
    query += " AND memo LIKE ?";
    params.push(`%${search}%`);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  const memoList = (results || []).map((row) => ({
    id: row.id,
    myCharacter: row.my_character,
    opponentCharacter: row.opponent_character,
    result: row.result,
    memo: row.memo,
    tags: JSON.parse((row.tags as string) || "[]"),
    isPublic: !!row.is_public,
    createdAt: row.created_at,
    lp: (row as any).lp || null,
    mr: (row as any).mr || null,
  }));

  return c.json(memoList);
});

// Update memo
memos.put("/:id", async (c) => {
  const userId = c.get("userId");
  const memoId = c.req.param("id");
  const { myCharacter, opponentCharacter, result, memo, tags, isPublic } = await c.req.json();

  const existing = await c.env.DB.prepare(
    "SELECT id FROM memos WHERE id = ? AND user_id = ?"
  ).bind(memoId, userId).first();

  if (!existing) {
    return c.json({ error: "メモが見つかりません" }, 404);
  }

  const tagsJson = JSON.stringify(tags || []);

  await c.env.DB.prepare(
    `UPDATE memos SET my_character = ?, opponent_character = ?, result = ?, memo = ?, tags = ?, is_public = ?
     WHERE id = ? AND user_id = ?`
  ).bind(myCharacter, opponentCharacter, result, memo || "", tagsJson, isPublic ? 1 : 0, memoId, userId).run();

  return c.json({ success: true });
});

// Delete memo
memos.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const memoId = c.req.param("id");

  const res = await c.env.DB.prepare(
    "DELETE FROM memos WHERE id = ? AND user_id = ?"
  ).bind(memoId, userId).run();

  if (!res.meta.changes) {
    return c.json({ error: "メモが見つかりません" }, 404);
  }

  return c.json({ success: true });
});

export default memos;
