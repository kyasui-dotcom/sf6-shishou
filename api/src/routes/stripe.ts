import { Hono } from "hono";
import { Env, authMiddleware } from "../middleware/auth";

const stripe = new Hono<Env>();

// Stripe REST API helper
async function stripeRequest(path: string, secretKey: string, body?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  return res.json() as Promise<any>;
}

// Webhook signature verification
async function verifyWebhookSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  tolerance: number = 300
): Promise<boolean> {
  const parts = sigHeader.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((s) => s === expectedSig);
}

// Create Checkout Session
stripe.post("/checkout", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const user = await c.env.DB.prepare("SELECT id, email, stripe_customer_id FROM users WHERE id = ?")
    .bind(userId)
    .first();

  if (!user) return c.json({ error: "ユーザーが見つかりません" }, 404);

  const origin = c.env.CORS_ORIGIN || "https://sf6-shishou.pages.dev";

  // Create or reuse Stripe customer
  let customerId = user.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripeRequest("/customers", c.env.STRIPE_SECRET_KEY, {
      email: user.email as string,
      "metadata[user_id]": userId,
    });
    customerId = customer.id;
    await c.env.DB.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
      .bind(customerId, userId)
      .run();
  }

  // Create Checkout Session
  const session = await stripeRequest("/checkout/sessions", c.env.STRIPE_SECRET_KEY, {
    customer: customerId!,
    "line_items[0][price]": c.env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    mode: "subscription",
    success_url: `${origin}?checkout=success`,
    cancel_url: `${origin}?checkout=cancel`,
  });

  if (session.error) {
    return c.json({ error: session.error.message }, 400);
  }

  return c.json({ url: session.url });
});

// Customer Portal
stripe.post("/portal", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const user = await c.env.DB.prepare("SELECT stripe_customer_id FROM users WHERE id = ?")
    .bind(userId)
    .first();

  if (!user?.stripe_customer_id) {
    return c.json({ error: "サブスクリプションがありません" }, 400);
  }

  const session = await stripeRequest("/billing_portal/sessions", c.env.STRIPE_SECRET_KEY, {
    customer: user.stripe_customer_id as string,
    return_url: c.env.CORS_ORIGIN || "https://sf6-shishou.pages.dev",
  });

  if (session.error) {
    return c.json({ error: session.error.message }, 400);
  }

  return c.json({ url: session.url });
});

// Webhook handler (no auth middleware - called by Stripe)
stripe.post("/webhook", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature");

  if (!sig) return c.json({ error: "Missing signature" }, 400);

  const valid = await verifyWebhookSignature(body, sig, c.env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return c.json({ error: "Invalid signature" }, 400);

  const event = JSON.parse(body);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.customer) {
        // Check if this is a creator subscription
        if (session.metadata?.type === "creator_subscription") {
          const creatorId = session.metadata.creator_id;
          const subscriberId = session.metadata.subscriber_id;
          if (creatorId && subscriberId) {
            await c.env.DB.prepare(
              `INSERT INTO creator_subscriptions (id, subscriber_id, creator_id, stripe_subscription_id, status)
               VALUES (?, ?, ?, ?, 'active')
               ON CONFLICT(subscriber_id, creator_id) DO UPDATE SET
                 stripe_subscription_id = ?, status = 'active'`
            ).bind(
              crypto.randomUUID(), subscriberId, creatorId,
              session.subscription, session.subscription
            ).run();
          }
        } else {
          // Platform premium subscription
          await c.env.DB.prepare(
            "UPDATE users SET plan = 'premium', stripe_subscription_id = ? WHERE stripe_customer_id = ?"
          ).bind(session.subscription, session.customer).run();
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      // Check if creator subscription
      if (subscription.metadata?.creator_id) {
        await c.env.DB.prepare(
          "UPDATE creator_subscriptions SET status = 'canceled' WHERE stripe_subscription_id = ?"
        ).bind(subscription.id).run();
      } else {
        await c.env.DB.prepare(
          "UPDATE users SET plan = 'free', stripe_subscription_id = NULL WHERE stripe_customer_id = ?"
        ).bind(subscription.customer).run();
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      // Check if creator subscription
      if (subscription.metadata?.creator_id) {
        const newStatus = subscription.status === "active" ? "active" : "canceled";
        await c.env.DB.prepare(
          "UPDATE creator_subscriptions SET status = ?, current_period_end = ? WHERE stripe_subscription_id = ?"
        ).bind(newStatus, subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null, subscription.id).run();
      } else {
        if (subscription.status === "active") {
          await c.env.DB.prepare(
            "UPDATE users SET plan = 'premium' WHERE stripe_customer_id = ?"
          ).bind(subscription.customer).run();
        } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
          await c.env.DB.prepare(
            "UPDATE users SET plan = 'free' WHERE stripe_customer_id = ?"
          ).bind(subscription.customer).run();
        }
      }
      break;
    }
  }

  return c.json({ received: true });
});

export default stripe;
