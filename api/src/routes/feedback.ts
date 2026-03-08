import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const feedback = new Hono<Env>();

feedback.use("/*", authMiddleware);

// Submit feedback
feedback.post("/", async (c) => {
  const userId = c.get("userId");
  const { content, category } = await c.req.json();

  if (!content || content.trim().length === 0) {
    return c.json({ error: "内容を入力してください" }, 400);
  }

  if (content.length > 500) {
    return c.json({ error: "500文字以内で入力してください" }, 400);
  }

  const id = crypto.randomUUID();
  const validCategory = ["feature", "bug", "improvement", "other"].includes(category) ? category : "other";

  await c.env.DB.prepare(
    "INSERT INTO feedback (id, user_id, content, category) VALUES (?, ?, ?, ?)"
  ).bind(id, userId, content.trim(), validCategory).run();

  return c.json({ id, content: content.trim(), category: validCategory }, 201);
});

// List feedback (public)
feedback.get("/", async (c) => {
  const userId = c.get("userId");
  const category = c.req.query("category");

  let query = `
    SELECT f.id, f.content, f.category, f.created_at, u.username,
      (SELECT COUNT(*) FROM feedback_votes WHERE feedback_id = f.id) as vote_count,
      (SELECT COUNT(*) FROM feedback_votes WHERE feedback_id = f.id AND user_id = ?) as user_voted
    FROM feedback f
    JOIN users u ON f.user_id = u.id
  `;
  const params: any[] = [userId];

  if (category && category !== "all") {
    query += " WHERE f.category = ?";
    params.push(category);
  }

  query += " ORDER BY vote_count DESC, f.created_at DESC LIMIT 50";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  const feedbackList = (results || []).map((row: any) => ({
    id: row.id,
    content: row.content,
    category: row.category,
    username: row.username,
    voteCount: row.vote_count,
    userVoted: row.user_voted > 0,
    createdAt: row.created_at,
  }));

  return c.json(feedbackList);
});

// Vote on feedback
feedback.post("/:id/vote", async (c) => {
  const userId = c.get("userId");
  const feedbackId = c.req.param("id");

  // Check if already voted
  const existing = await c.env.DB.prepare(
    "SELECT id FROM feedback_votes WHERE feedback_id = ? AND user_id = ?"
  ).bind(feedbackId, userId).first();

  if (existing) {
    // Remove vote (toggle)
    await c.env.DB.prepare(
      "DELETE FROM feedback_votes WHERE feedback_id = ? AND user_id = ?"
    ).bind(feedbackId, userId).run();
    return c.json({ voted: false });
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO feedback_votes (id, feedback_id, user_id) VALUES (?, ?, ?)"
  ).bind(id, feedbackId, userId).run();

  return c.json({ voted: true });
});

export default feedback;
