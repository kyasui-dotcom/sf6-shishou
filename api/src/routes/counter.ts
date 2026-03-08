import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const counter = new Hono<Env>();

counter.use("/*", authMiddleware);

// Get counter-strategy advice for an annoying move
counter.post("/", async (c) => {
  const userId = c.get("userId");

  // Check plan
  const user = await c.env.DB.prepare("SELECT plan FROM users WHERE id = ?").bind(userId).first();
  if (!user || user.plan === "free") {
    return c.json({ error: "技対策はAI有料プラン限定機能です。プランをアップグレードしてください。" }, 403);
  }

  const { myCharacter, opponentCharacter, annoyingMove } = await c.req.json();

  if (!opponentCharacter || !annoyingMove) {
    return c.json({ error: "相手キャラとやられた技は必須です" }, 400);
  }

  const prompt = `あなたはストリートファイター6の上級プレイヤーであり、コーチです。

プレイヤーが以下の状況で困っています：

- 自分のキャラ: ${myCharacter || "未指定"}
- 相手のキャラ: ${opponentCharacter}
- やられて困っている技/行動: ${annoyingMove}

以下の形式で具体的な対策を教えてください。スト6のシステム（ドライブインパクト、パリィ、ドライブラッシュ等）を踏まえて回答してください。

### 🔍 その技/行動の特徴
フレームデータや判定などの基本情報を簡潔に。

### 🛡️ 対策方法
具体的な対策を優先度順にリストアップ。ガード後の確定反撃やタイミング等も含めて。

### 🎯 練習方法
トレーニングモードでの練習手順。ダミー設定も具体的に。

### ⚡ とっさの対処法
試合中にすぐ使える簡易的な対処法。`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": c.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error("Claude API error:", await response.text());
    return c.json({ error: "AI対策アドバイスの生成に失敗しました。" }, 500);
  }

  const aiResponse: any = await response.json();
  const advice = aiResponse.content?.[0]?.text || "対策を生成できませんでした。";

  return c.json({ advice });
});

export default counter;
