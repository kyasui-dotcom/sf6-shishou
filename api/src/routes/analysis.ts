import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";
import { callClaude } from "../lib/claude";

const analysis = new Hono<Env>();

analysis.use("/*", authMiddleware);

analysis.post("/", async (c) => {
  const userId = c.get("userId");

  const user = await c.env.DB.prepare("SELECT plan FROM users WHERE id = ?").bind(userId).first();
  if (!user || user.plan === "free") {
    return c.json({ error: "AI分析は有料プラン限定機能です。プランをアップグレードしてください。" }, 403);
  }

  const { myCharacter, opponentCharacter } = await c.req.json();

  let memoQuery = "SELECT * FROM memos WHERE user_id = ?";
  const memoParams: (string | number)[] = [userId];

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

  let communityMemos: Record<string, unknown>[] = [];
  if (myCharacter && opponentCharacter) {
    const { results } = await c.env.DB.prepare(
      `SELECT my_character, opponent_character, result, memo, tags FROM memos
       WHERE is_public = 1 AND user_id != ? AND my_character = ? AND opponent_character = ?
       ORDER BY created_at DESC LIMIT 50`
    ).bind(userId, myCharacter, opponentCharacter).all();
    communityMemos = results || [];
  }

  const formatMemo = (m: Record<string, unknown>, i: number, includeChars: boolean) => {
    const tags: string[] = JSON.parse((m.tags as string) || "[]");
    const resultLabel = m.result === "win" ? "勝ち" : "負け";
    const chars = includeChars ? ` ${m.my_character} vs ${m.opponent_character} |` : "";
    return `${i + 1}. [${resultLabel}]${chars} メモ: ${m.memo || "なし"} | タグ: ${tags.join(", ") || "なし"}`;
  };

  const userMemoText = userMemos.map((m, i) => formatMemo(m, i, true)).join("\n");
  const communityMemoText = communityMemos.length > 0
    ? communityMemos.map((m, i) => formatMemo(m, i, false)).join("\n")
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

  try {
    const analysisText = await callClaude({
      apiKey: c.env.ANTHROPIC_API_KEY,
      maxTokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    return c.json({
      analysis: analysisText || "分析結果を取得できませんでした。",
      memoCount: userMemos.length,
      communityMemoCount: communityMemos.length,
    });
  } catch {
    return c.json({ error: "AI分析に失敗しました。しばらく待ってから再度お試しください。" }, 500);
  }
});

export default analysis;
