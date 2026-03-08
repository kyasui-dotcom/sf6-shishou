import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env } from "./middleware/auth";
import auth from "./routes/auth";
import memos from "./routes/memos";
import stats from "./routes/stats";
import analysis from "./routes/analysis";
import community from "./routes/community";
import counter from "./routes/counter";
import feedback from "./routes/feedback";

const app = new Hono<Env>();

// CORS
app.use("/*", cors({
  origin: (origin, c) => {
    return c.env.CORS_ORIGIN || "http://localhost:5173";
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Routes
app.route("/api/auth", auth);
app.route("/api/memos", memos);
app.route("/api/stats", stats);
app.route("/api/analysis", analysis);
app.route("/api/community", community);
app.route("/api/counter", counter);
app.route("/api/feedback", feedback);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;
