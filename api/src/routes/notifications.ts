import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const notifications = new Hono<Env>();
notifications.use("/*", authMiddleware);

// GET /vapid-key - Return public VAPID key
notifications.get("/vapid-key", async (c) => {
  const key = c.env.VAPID_PUBLIC_KEY;
  if (!key) return c.json({ publicKey: null });
  return c.json({ publicKey: key });
});

// POST /subscribe - Store push subscription
notifications.post("/subscribe", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return c.json({ error: "Invalid subscription" }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
  ).bind(id, userId, endpoint, keys.p256dh, keys.auth).run();

  return c.json({ success: true });
});

// DELETE /subscribe - Remove push subscription
notifications.delete("/subscribe", async (c) => {
  const userId = c.get("userId");
  const { endpoint } = await c.req.json();

  if (!endpoint) return c.json({ error: "Missing endpoint" }, 400);

  await c.env.DB.prepare(
    "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?"
  ).bind(userId, endpoint).run();

  return c.json({ success: true });
});

export default notifications;
