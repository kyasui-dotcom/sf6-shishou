import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const creators = new Hono<Env>();

creators.use("/*", authMiddleware);

// Stripe REST API helper
async function stripeRequest(
  path: string,
  secretKey: string,
  body?: Record<string, string>,
  method = "POST"
) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  return res.json() as Promise<any>;
}

// POST /api/creators/register - Start Stripe Connect onboarding
creators.post("/register", async (c) => {
  const userId = c.get("userId");
  const origin = c.env.CORS_ORIGIN || "https://sf6-shishou.pages.dev";

  // Get user info + plan check in one query
  const user = await c.env.DB.prepare(
    "SELECT plan, email, username FROM users WHERE id = ?"
  ).bind(userId).first();
  if (!user) return c.json({ error: "ユーザーが見つかりません" }, 404);
  if (user.plan !== "premium") {
    return c.json({ error: "クリエイター機能はプレミアムプラン限定です" }, 403);
  }

  // Check if already a creator
  const existing = await c.env.DB.prepare(
    "SELECT stripe_account_id FROM creators WHERE user_id = ?"
  )
    .bind(userId)
    .first();

  let stripeAccountId = existing?.stripe_account_id as string | null;

  if (!stripeAccountId) {

    // Create Stripe Connect Express account
    const account = await stripeRequest(
      "/accounts",
      c.env.STRIPE_SECRET_KEY,
      {
        type: "express",
        country: "JP",
        email: user.email as string,
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        "metadata[user_id]": userId,
      }
    );

    if (account.error) {
      return c.json({ error: account.error.message }, 400);
    }

    stripeAccountId = account.id;

    // Insert creator record
    await c.env.DB.prepare(
      `INSERT INTO creators (user_id, stripe_account_id, display_name)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET stripe_account_id = ?`
    )
      .bind(userId, stripeAccountId, user.username, stripeAccountId)
      .run();
  }

  // Create onboarding link
  const accountLink = await stripeRequest(
    "/account_links",
    c.env.STRIPE_SECRET_KEY,
    {
      account: stripeAccountId!,
      refresh_url: `${origin}?creator=refresh`,
      return_url: `${origin}?creator=complete`,
      type: "account_onboarding",
    }
  );

  if (accountLink.error) {
    return c.json({ error: accountLink.error.message }, 400);
  }

  return c.json({ url: accountLink.url });
});

// GET /api/creators/me - Get my creator profile
creators.get("/me", async (c) => {
  const userId = c.get("userId");

  const creator = await c.env.DB.prepare(
    "SELECT * FROM creators WHERE user_id = ?"
  )
    .bind(userId)
    .first();

  if (!creator) {
    return c.json({ isCreator: false });
  }

  // Check onboarding status from Stripe if not yet complete
  if (!creator.onboarding_complete && creator.stripe_account_id) {
    const account = await stripeRequest(
      `/accounts/${creator.stripe_account_id}`,
      c.env.STRIPE_SECRET_KEY,
      undefined,
      "GET"
    );
    if (account.charges_enabled && account.details_submitted) {
      await c.env.DB.prepare(
        "UPDATE creators SET onboarding_complete = 1 WHERE user_id = ?"
      )
        .bind(userId)
        .run();
      creator.onboarding_complete = 1;
    }
  }

  // Get subscriber count
  const stats = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM creator_subscriptions WHERE creator_id = ? AND status = 'active'"
  )
    .bind(userId)
    .first();

  return c.json({
    isCreator: true,
    onboardingComplete: !!creator.onboarding_complete,
    displayName: creator.display_name,
    bio: creator.bio,
    monthlyPrice: creator.monthly_price,
    isActive: !!creator.is_active,
    subscriberCount: stats?.count || 0,
  });
});

// PUT /api/creators/me - Update profile & price
creators.put("/me", async (c) => {
  const userId = c.get("userId");
  const { displayName, bio, monthlyPrice, isActive } = await c.req.json();

  const creator = await c.env.DB.prepare(
    "SELECT * FROM creators WHERE user_id = ?"
  )
    .bind(userId)
    .first();
  if (!creator) return c.json({ error: "クリエイター登録が必要です" }, 400);

  const price = Math.max(300, Math.min(100000, monthlyPrice || 500));

  await c.env.DB.prepare(
    `UPDATE creators SET display_name = ?, bio = ?, monthly_price = ?, is_active = ?
     WHERE user_id = ?`
  )
    .bind(
      displayName || creator.display_name,
      bio ?? creator.bio,
      price,
      isActive ? 1 : 0,
      userId
    )
    .run();

  return c.json({ success: true });
});

// GET /me/analytics - Creator analytics
creators.get("/me/analytics", async (c) => {
  const userId = c.get("userId");

  const creator = await c.env.DB.prepare(
    "SELECT * FROM creators WHERE user_id = ?"
  ).bind(userId).first();
  if (!creator) return c.json({ error: "Not a creator" }, 403);

  // Current subscriber count
  const subCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM creator_subscriptions WHERE creator_id = ? AND status = 'active'"
  ).bind(userId).first();

  // Subscriber growth by month
  const { results: subGrowth } = await c.env.DB.prepare(
    `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as new_subs
     FROM creator_subscriptions WHERE creator_id = ?
     GROUP BY month ORDER BY month ASC`
  ).bind(userId).all();

  // Revenue estimate (subscribers * price * 0.9)
  const subscriberCount = (subCount?.count as number) || 0;
  const revenue = subscriberCount * ((creator.monthly_price as number) || 0) * 0.9;

  // Total public memos count
  const memoCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM memos WHERE user_id = ? AND is_public = 1"
  ).bind(userId).first();

  // Top memos (most recent public memos)
  const { results: topMemos } = await c.env.DB.prepare(
    `SELECT m.id, m.my_character, m.opponent_character, m.result,
            SUBSTR(m.memo, 1, 100) as memo, m.created_at,
            (SELECT COUNT(*) FROM memo_likes ml WHERE ml.memo_id = m.id) as like_count
     FROM memos m WHERE m.user_id = ? AND m.is_public = 1
     ORDER BY like_count DESC, m.created_at DESC LIMIT 10`
  ).bind(userId).all();

  return c.json({
    subscriberCount,
    estimatedRevenue: Math.floor(revenue),
    publicMemoCount: (memoCount?.count as number) || 0,
    subscriberGrowth: (subGrowth || []).map((r: any) => ({
      month: r.month,
      newSubscribers: r.new_subs,
    })),
    topMemos: (topMemos || []).map((r: any) => ({
      id: r.id,
      myCharacter: r.my_character,
      opponentCharacter: r.opponent_character,
      result: r.result,
      memo: r.memo || "",
      likeCount: r.like_count || 0,
      createdAt: r.created_at,
    })),
  });
});

// GET /api/creators - List active creators
creators.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.user_id, c.display_name, c.bio, c.monthly_price, c.created_at,
            u.username, u.main_character,
            (SELECT COUNT(*) FROM creator_subscriptions cs
             WHERE cs.creator_id = c.user_id AND cs.status = 'active') as subscriber_count
     FROM creators c
     JOIN users u ON c.user_id = u.id
     WHERE c.is_active = 1 AND c.onboarding_complete = 1
     ORDER BY subscriber_count DESC`
  ).all();

  return c.json(
    (results || []).map((r: any) => ({
      id: r.user_id,
      displayName: r.display_name,
      bio: r.bio,
      monthlyPrice: r.monthly_price,
      username: r.username,
      mainCharacter: r.main_character,
      subscriberCount: r.subscriber_count,
    }))
  );
});

// GET /api/creators/:id - Creator detail + public memos
creators.get("/:id", async (c) => {
  const creatorId = c.req.param("id");
  const userId = c.get("userId");

  const creator = await c.env.DB.prepare(
    `SELECT c.*, u.username, u.main_character FROM creators c
     JOIN users u ON c.user_id = u.id
     WHERE c.user_id = ? AND c.is_active = 1`
  )
    .bind(creatorId)
    .first();

  if (!creator) return c.json({ error: "クリエイターが見つかりません" }, 404);

  // Check if subscriber
  const sub = await c.env.DB.prepare(
    "SELECT status FROM creator_subscriptions WHERE subscriber_id = ? AND creator_id = ? AND status = 'active'"
  )
    .bind(userId, creatorId)
    .first();

  const isSubscribed = !!sub;
  const isOwner = userId === creatorId;

  // Get memos
  const { results: memos } = await c.env.DB.prepare(
    `SELECT m.*, u.username FROM memos m
     JOIN users u ON m.user_id = u.id
     WHERE m.user_id = ? AND m.is_public = 1
     ORDER BY m.created_at DESC LIMIT 100`
  )
    .bind(creatorId)
    .all();

  const memoList = (memos || []).map((row: any) => ({
    id: row.id,
    username: row.username,
    myCharacter: row.my_character,
    opponentCharacter: row.opponent_character,
    result: row.result,
    memo: isSubscribed || isOwner ? row.memo : (row.memo || "").slice(0, 50),
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at,
    isPreview: !isSubscribed && !isOwner,
  }));

  return c.json({
    id: creator.user_id,
    displayName: creator.display_name,
    bio: creator.bio,
    monthlyPrice: creator.monthly_price,
    username: creator.username,
    mainCharacter: creator.main_character,
    isSubscribed,
    isOwner,
    memos: memoList,
  });
});

// POST /api/creators/:id/subscribe - Start subscription checkout
creators.post("/:id/subscribe", async (c) => {
  const creatorId = c.req.param("id");
  const userId = c.get("userId");
  const origin = c.env.CORS_ORIGIN || "https://sf6-shishou.pages.dev";

  if (userId === creatorId) {
    return c.json({ error: "自分自身を購読することはできません" }, 400);
  }

  const creator = await c.env.DB.prepare(
    "SELECT * FROM creators WHERE user_id = ? AND is_active = 1 AND onboarding_complete = 1"
  )
    .bind(creatorId)
    .first();
  if (!creator)
    return c.json({ error: "クリエイターが見つかりません" }, 404);

  // Get or create Stripe customer for subscriber
  const user = await c.env.DB.prepare(
    "SELECT id, email, stripe_customer_id FROM users WHERE id = ?"
  )
    .bind(userId)
    .first();
  if (!user) return c.json({ error: "ユーザーが見つかりません" }, 404);

  let customerId = user.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripeRequest(
      "/customers",
      c.env.STRIPE_SECRET_KEY,
      {
        email: user.email as string,
        "metadata[user_id]": userId,
      }
    );
    customerId = customer.id;
    await c.env.DB.prepare(
      "UPDATE users SET stripe_customer_id = ? WHERE id = ?"
    )
      .bind(customerId, userId)
      .run();
  }

  // Create a price for this creator (or reuse if exists)
  // For simplicity, create a new price each time (Stripe handles dedup via idempotency)
  const price = await stripeRequest("/prices", c.env.STRIPE_SECRET_KEY, {
    currency: "jpy",
    unit_amount: String(creator.monthly_price),
    "recurring[interval]": "month",
    "product_data[name]": `${creator.display_name} サブスク`,
    "product_data[metadata][creator_id]": creatorId,
  });

  if (price.error) {
    return c.json({ error: price.error.message }, 400);
  }

  // Create Checkout Session with destination charge
  const session = await stripeRequest(
    "/checkout/sessions",
    c.env.STRIPE_SECRET_KEY,
    {
      customer: customerId!,
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
      mode: "subscription",
      "subscription_data[application_fee_percent]": "10",
      "subscription_data[transfer_data][destination]":
        creator.stripe_account_id as string,
      "subscription_data[metadata][creator_id]": creatorId,
      "subscription_data[metadata][subscriber_id]": userId,
      "metadata[type]": "creator_subscription",
      "metadata[creator_id]": creatorId,
      "metadata[subscriber_id]": userId,
      success_url: `${origin}?creator_sub=success&creator=${creatorId}`,
      cancel_url: `${origin}?creator_sub=cancel`,
    }
  );

  if (session.error) {
    return c.json({ error: session.error.message }, 400);
  }

  return c.json({ url: session.url });
});

// GET /api/creators/subscriptions - My subscriptions
creators.get("/subscriptions/list", async (c) => {
  const userId = c.get("userId");

  const { results } = await c.env.DB.prepare(
    `SELECT cs.*, c.display_name, c.monthly_price, u.username, u.main_character
     FROM creator_subscriptions cs
     JOIN creators c ON cs.creator_id = c.user_id
     JOIN users u ON cs.creator_id = u.id
     WHERE cs.subscriber_id = ? AND cs.status = 'active'
     ORDER BY cs.created_at DESC`
  )
    .bind(userId)
    .all();

  return c.json(
    (results || []).map((r: any) => ({
      id: r.id,
      creatorId: r.creator_id,
      displayName: r.display_name,
      monthlyPrice: r.monthly_price,
      username: r.username,
      mainCharacter: r.main_character,
      status: r.status,
    }))
  );
});

export default creators;
