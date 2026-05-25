import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const importRoute = new Hono<Env>();

importRoute.use("/*", authMiddleware);

type MatchImport = {
  myCharacter: string;
  opponentCharacter: string;
  result: "win" | "loss";
  replayId: string;
  playedAt?: string;
  lp?: number;
  mr?: number;
};

importRoute.post("/", async (c) => {
  const userId = c.get("userId");
  const { matches } = await c.req.json<{ matches: MatchImport[] }>();

  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return c.json({ error: "対戦データがありません" }, 400);
  }

  if (matches.length > 500) {
    return c.json({ error: "一度にインポートできるのは500件までです" }, 400);
  }

  // Validate and filter matches
  const valid: MatchImport[] = [];
  let skipped = 0;

  for (const match of matches) {
    if (!match.myCharacter || !match.opponentCharacter || !match.result || !match.replayId) {
      skipped++;
      continue;
    }
    if (match.result !== "win" && match.result !== "loss") {
      skipped++;
      continue;
    }
    valid.push(match);
  }

  if (valid.length === 0) {
    return c.json({ imported: 0, skipped, total: matches.length }, 200);
  }

  // Batch check for existing replay_ids
  const replayIds = valid.map((m) => m.replayId);
  const existingSet = new Set<string>();

  // D1 has a limit on bind params, check in chunks of 50
  for (let i = 0; i < replayIds.length; i += 50) {
    const chunk = replayIds.slice(i, i + 50);
    const placeholders = chunk.map(() => "?").join(",");
    const { results } = await c.env.DB.prepare(
      `SELECT replay_id FROM memos WHERE user_id = ? AND replay_id IN (${placeholders})`
    ).bind(userId, ...chunk).all();
    for (const row of results || []) {
      existingSet.add(row.replay_id as string);
    }
  }

  // Build batch insert statements
  const stmts: D1PreparedStatement[] = [];

  for (const match of valid) {
    if (existingSet.has(match.replayId)) {
      skipped++;
      continue;
    }

    const id = crypto.randomUUID();
    const memo = match.mr ? `Bucklerからインポート (MR: ${match.mr})` :
                 match.lp ? `Bucklerからインポート (LP: ${match.lp})` :
                 "Bucklerからインポート";
    const tags = JSON.stringify(["インポート"]);
    const createdAt = match.playedAt || new Date().toISOString();

    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO memos (id, user_id, my_character, opponent_character, result, memo, tags, is_public, replay_id, created_at, lp, mr)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
      ).bind(id, userId, match.myCharacter, match.opponentCharacter, match.result, memo, tags, match.replayId, createdAt, match.lp || null, match.mr || null)
    );
  }

  // Execute batch (D1 batch is atomic and much faster)
  if (stmts.length > 0) {
    await c.env.DB.batch(stmts);
  }

  return c.json({ imported: stmts.length, skipped, total: matches.length }, 200);
});

export default importRoute;
