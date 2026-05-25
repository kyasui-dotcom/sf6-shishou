import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const community = new Hono<Env>();

// Community browsing requires auth
community.use("/*", authMiddleware);

// List public memos with filters (with creator access control)
community.get("/memos", async (c) => {
  const userId = c.get("userId");
  const myChar = c.req.query("myCharacter");
  const opponent = c.req.query("opponent");
  const result = c.req.query("result");
  const sort = c.req.query("sort");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  let query = `
    SELECT m.*, u.username,
      CASE WHEN cr.user_id IS NOT NULL AND cr.is_active = 1 THEN 1 ELSE 0 END as is_creator_memo,
      (SELECT COUNT(*) FROM memo_likes ml WHERE ml.memo_id = m.id) as like_count,
      (SELECT COUNT(*) FROM memo_likes ml2 WHERE ml2.memo_id = m.id AND ml2.user_id = ?) as user_liked
    FROM memos m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN creators cr ON m.user_id = cr.user_id AND cr.is_active = 1 AND cr.onboarding_complete = 1
    WHERE m.is_public = 1
  `;
  const params: any[] = [userId];

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
  const search = c.req.query("search");
  if (search) {
    query += " AND m.memo LIKE ?";
    params.push(`%${search}%`);
  }

  if (sort === "popular") {
    query += " ORDER BY like_count DESC, m.created_at DESC";
  } else {
    query += " ORDER BY m.created_at DESC";
  }
  query += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  // Get user's active creator subscriptions
  const { results: subs } = await c.env.DB.prepare(
    "SELECT creator_id FROM creator_subscriptions WHERE subscriber_id = ? AND status = 'active'"
  ).bind(userId).all();
  const subscribedCreators = new Set((subs || []).map((s: any) => s.creator_id));

  const memoList = (results || []).map((row: any) => {
    const isCreatorMemo = !!row.is_creator_memo;
    const isOwn = row.user_id === userId;
    const isSubscribed = subscribedCreators.has(row.user_id);
    const canViewFull = !isCreatorMemo || isOwn || isSubscribed;

    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      myCharacter: row.my_character,
      opponentCharacter: row.opponent_character,
      result: row.result,
      memo: canViewFull ? row.memo : (row.memo || "").slice(0, 50),
      tags: JSON.parse(row.tags || "[]"),
      createdAt: row.created_at,
      isCreatorMemo,
      isPreview: !canViewFull,
      likeCount: row.like_count || 0,
      userLiked: !!row.user_liked,
    };
  });

  return c.json(memoList);
});

community.post("/memos/:id/like", async (c) => {
  const userId = c.get("userId");
  const memoId = c.req.param("id");

  const existing = await c.env.DB.prepare(
    "SELECT id FROM memo_likes WHERE user_id = ? AND memo_id = ?"
  ).bind(userId, memoId).first();

  if (existing) {
    await c.env.DB.prepare(
      "DELETE FROM memo_likes WHERE user_id = ? AND memo_id = ?"
    ).bind(userId, memoId).run();
    return c.json({ liked: false });
  } else {
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO memo_likes (id, user_id, memo_id) VALUES (?, ?, ?)"
    ).bind(id, userId, memoId).run();
    return c.json({ liked: true });
  }
});

// List public combos with ratings
community.get("/combos", async (c) => {
  const userId = c.get("userId");
  const character = c.req.query("character");
  const controlType = c.req.query("controlType");
  const search = c.req.query("search");
  const sort = c.req.query("sort");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  let query = `
    SELECT cm.*, u.username,
      (SELECT COUNT(*) FROM combo_ratings cr WHERE cr.combo_id = cm.id AND cr.rating = 'works') as works_count,
      (SELECT COUNT(*) FROM combo_ratings cr2 WHERE cr2.combo_id = cm.id AND cr2.rating = 'doesnt_work') as doesnt_work_count,
      (SELECT rating FROM combo_ratings cr3 WHERE cr3.combo_id = cm.id AND cr3.user_id = ?) as user_rating
    FROM combo_memos cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.is_public = 1
  `;
  const params: any[] = [userId];

  if (character) {
    query += " AND cm.character = ?";
    params.push(character);
  }
  if (controlType) {
    query += " AND cm.control_type = ?";
    params.push(controlType);
  }
  if (search) {
    query += " AND (cm.name LIKE ? OR cm.command LIKE ? OR cm.memo LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (sort === "popular") {
    query += " ORDER BY works_count DESC, cm.created_at DESC";
  } else {
    query += " ORDER BY cm.created_at DESC";
  }
  query += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json((results || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    character: row.character,
    name: row.name,
    command: row.command,
    damage: row.damage,
    memo: row.memo,
    videoUrl: row.video_url || null,
    controlType: row.control_type || "classic",
    worksCount: row.works_count || 0,
    doesntWorkCount: row.doesnt_work_count || 0,
    userRating: row.user_rating || null,
    createdAt: row.created_at,
  })));
});

// Rate a combo (works / doesnt_work)
community.post("/combos/:id/rate", async (c) => {
  const userId = c.get("userId");
  const comboId = c.req.param("id");
  const { rating } = await c.req.json();

  if (rating !== "works" && rating !== "doesnt_work") {
    return c.json({ error: "Invalid rating" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id, rating FROM combo_ratings WHERE user_id = ? AND combo_id = ?"
  ).bind(userId, comboId).first();

  if (existing) {
    if (existing.rating === rating) {
      // Same rating → toggle off (delete)
      await c.env.DB.prepare(
        "DELETE FROM combo_ratings WHERE user_id = ? AND combo_id = ?"
      ).bind(userId, comboId).run();
      return c.json({ rating: null });
    } else {
      // Different rating → update
      await c.env.DB.prepare(
        "UPDATE combo_ratings SET rating = ?, created_at = datetime('now') WHERE user_id = ? AND combo_id = ?"
      ).bind(rating, userId, comboId).run();
      return c.json({ rating });
    }
  } else {
    // New rating
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO combo_ratings (id, user_id, combo_id, rating) VALUES (?, ?, ?, ?)"
    ).bind(id, userId, comboId, rating).run();
    return c.json({ rating });
  }
});

export default community;
