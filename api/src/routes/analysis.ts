import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const analysis = new Hono<Env>();

analysis.use("/*", authMiddleware);

analysis.post("/", async (c) => {
  const userId = c.get("userId");

  // Check plan
  const user = await c.env.DB.prepare("SELECT plan FROM users WHERE id = ?").bind(userId).first();
  if (!user || user.plan === "free") {
    return c.json({ error: "AI分析は有料プラン限定機能です。プランをアップグレードしてください。" }, 403);
  }

  const { myCharacter, opponentCharacter } = await c.req.json();

  // Get user's memos
  let memoQuery = "SELECT * FROM memos WHERE user_id = ?";
  const memoParams: any[] = [userId];

  if (opponentCharacter) {
    memoQuery += " AND opponent_character = ?";
    memoParams.push(opponentCharacter);
  }
  if (myCharacter) {
    memoQuery += " AND my_character = ?";
    memoParams.push(myCharacter);
  }

  memoQuery += " ORDER BY created_at DESC LIMIT 100";

  const { results: userMemos } = await c.env.DB.prepare(memoQuery).bind(...memoParams).all();

  if (!userMemos || userMemos.length === 0) {
    return c.json({ error: "分析するメモがありません。まず対戦メモを記録してください。" }, 400);
  }

  // Get community memos for the same matchup
  let communityMemos: any[] = [];
  if (myCharacter && opponentCharacter) {
    const { results } = await c.env.DB.prepare(
      `SELECT my_character, opponent_character, result, memo, tags FROM memos
       WHERE is_public = 1 AND user_id != ? AND my_character = ? AND opponent_character = ?
       ORDER BY created_at DESC LIMIT 50`
    ).bind(userId, myCharacter, opponentCharacter).all();
    communityMemos = results || [];
  }

  // Format memos for AI
  const userMemoText = (userMemos as any[]).map((m, i) => {
    const tags = JSON.parse(m.tags || "[]");
    return `${i + 1}. [${m.result === "win" ? "勝ち" : "負け"}] ${m.my_character} vs ${m.opponent_character} | メモ: ${m.memo || "なし"} | タグ: ${tags.join(", ") || "なし"}`;
  }).join("\n");

  const communityMemoText = communityMemos.length > 0
    ? communityMemos.map((m: any, i) => {
        const tags = JSON.parse(m.tags || "[]");
        return `${i + 1}. [${m.result === "win" ? "勝ち" : "負け"}] メモ: ${m.memo || "なし"} | タグ: ${tags.join(", ") || "なし"}`;
      }).join("\n")
    : "コミュニティデータはまだありません。";

  const prompt = `あなたはストリートファイター6の上級プレイヤーであり、コーチです。
以下はプレイヤーの対戦メモです。このプレイヤーの弱点を分析し、具体的な改善アドバイスを提供してください。

## プレイヤーの対戦メモ（直近${userMemos.length}件）
${userMemoText}

## 同じキャラ対のコミュニティメモ
${communityMemoText}

以下の形式で回答してください：

### 📊 分析サマリー
勝率や傾向の概要を簡潔に。

### 🔍 主な負けパターン
負けている原因をパターン分けして具体的に指摘してください。

### 💡 改善アドバイス
各負けパターンに対する具体的な対策を提案してください。スト6のシステム（ドライブシステム等）を踏まえた実践的なアドバイスをお願いします。

### 🎯 練習メニュー
トレーニングモードでの練習メニューを優先度順に提案してください。

### 📈 成長ポイント
良い傾向や伸びている点があれば指摘してください。`;

  // Call Claude API
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": c.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Claude API error:", errorText);
    return c.json({ error: "AI分析に失敗しました。しばらく待ってから再度お試しください。" }, 500);
  }

  const aiResponse: any = await response.json();
  const analysisText = aiResponse.content?.[0]?.text || "分析結果を取得できませんでした。";

  return c.json({
    analysis: analysisText,
    memoCount: userMemos.length,
    communityMemoCount: communityMemos.length,
  });
});

export default analysis;
