import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";
import { translateText, toDeepLLang } from "../lib/deepl";

const translate = new Hono<Env>();

translate.use("/*", authMiddleware);

// POST /api/translate - Translate a community memo (premium only)
translate.post("/", async (c) => {
  const userId = c.get("userId");

  const user = await c.env.DB.prepare("SELECT plan FROM users WHERE id = ?")
    .bind(userId)
    .first();
  if (!user || user.plan === "free") {
    return c.json({ error: "翻訳機能は有料プラン限定です。" }, 403);
  }

  const { memoId, targetLang } = await c.req.json();

  if (!memoId) {
    return c.json({ error: "memoIdが必要です。" }, 400);
  }

  const deepLLang = toDeepLLang(targetLang);
  if (!deepLLang) {
    return c.json({ error: "この言語は翻訳に対応していません。" }, 400);
  }

  // Check cache
  const cached = await c.env.DB.prepare(
    "SELECT translated_text FROM translation_cache WHERE memo_id = ? AND target_lang = ?"
  )
    .bind(memoId, targetLang)
    .first();

  if (cached) {
    return c.json({ translatedText: cached.translated_text, cached: true });
  }

  // Fetch original memo
  const memo = await c.env.DB.prepare(
    "SELECT memo FROM memos WHERE id = ? AND is_public = 1"
  )
    .bind(memoId)
    .first();

  if (!memo?.memo) {
    return c.json({ error: "メモが見つかりません。" }, 404);
  }

  // Call DeepL
  const [translatedText] = await translateText({
    apiKey: c.env.DEEPL_API_KEY,
    text: [memo.memo as string],
    targetLang: deepLLang,
  });

  // Cache result
  await c.env.DB.prepare(
    "INSERT OR REPLACE INTO translation_cache (id, memo_id, target_lang, translated_text) VALUES (?, ?, ?, ?)"
  )
    .bind(crypto.randomUUID(), memoId, targetLang, translatedText)
    .run();

  return c.json({ translatedText, cached: false });
});

export default translate;
