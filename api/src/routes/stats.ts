import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const stats = new Hono<Env>();

stats.use("/*", authMiddleware);

stats.get("/", async (c) => {
  const userId = c.get("userId");

  // Overall stats
  const overall = await c.env.DB.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
       SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses
     FROM memos WHERE user_id = ?`
  ).bind(userId).first();

  // Stats by opponent character
  const { results: byOpponent } = await c.env.DB.prepare(
    `SELECT
       opponent_character,
       COUNT(*) as total,
       SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
       SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses
     FROM memos WHERE user_id = ?
     GROUP BY opponent_character
     ORDER BY total DESC`
  ).bind(userId).all();

  // Stats by tag (from losses)
  const { results: lossMemos } = await c.env.DB.prepare(
    `SELECT tags FROM memos WHERE user_id = ? AND result = 'loss'`
  ).bind(userId).all();

  const tagCounts: Record<string, number> = {};
  for (const row of lossMemos || []) {
    const tags: string[] = JSON.parse((row as any).tags || "[]");
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const tagStats = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  return c.json({
    overall: {
      total: overall?.total || 0,
      wins: overall?.wins || 0,
      losses: overall?.losses || 0,
      winRate: overall?.total ? Math.round(((overall.wins as number) / (overall.total as number)) * 100) : 0,
    },
    byOpponent: (byOpponent || []).map((row: any) => ({
      character: row.opponent_character,
      total: row.total,
      wins: row.wins,
      losses: row.losses,
      winRate: row.total ? Math.round((row.wins / row.total) * 100) : 0,
    })),
    lossTagStats: tagStats,
  });
});

stats.get("/lp-history", async (c) => {
  const userId = c.get("userId");
  const myChar = c.req.query("myCharacter");
  const period = c.req.query("period") || "all";

  let query = `SELECT created_at, lp, mr, my_character, result
               FROM memos WHERE user_id = ? AND (lp IS NOT NULL OR mr IS NOT NULL)`;
  const params: any[] = [userId];

  if (myChar) {
    query += " AND my_character = ?";
    params.push(myChar);
  }

  if (period !== "all") {
    const days = { "7d": 7, "30d": 30, "90d": 90 }[period] || 30;
    query += ` AND created_at >= datetime('now', '-${days} days')`;
  }

  query += " ORDER BY created_at ASC LIMIT 500";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results?.map((r: any) => ({
    createdAt: r.created_at,
    lp: r.lp,
    mr: r.mr,
    myCharacter: r.my_character,
    result: r.result,
  })) || []);
});

export default stats;
