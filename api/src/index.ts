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
import stripeRoutes from "./routes/stripe";
import importRoute from "./routes/import";
import notes from "./routes/notes";
import combos from "./routes/combos";
import translate from "./routes/translate";
import creators from "./routes/creators";
import notifications from "./routes/notifications";
import frameData from "./routes/frame-data";
import setplays from "./routes/setplays";

const app = new Hono<Env>();

// CORS
app.use("/*", cors({
  origin: (origin, c) => {
    const main = c.env.CORS_ORIGIN || "http://localhost:5173";
    if (origin === main) return origin;
    if (origin === "https://www.streetfighter.com") return origin;
    return main;
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
app.route("/api/stripe", stripeRoutes);
app.route("/api/import", importRoute);
app.route("/api/notes", notes);
app.route("/api/combos", combos);
app.route("/api/translate", translate);
app.route("/api/creators", creators);
app.route("/api/notifications", notifications);
app.route("/api/frame-data", frameData);
app.route("/api/setplays", setplays);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;
