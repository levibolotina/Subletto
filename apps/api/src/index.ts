import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import clerkAuthPlugin from "./plugins/clerk-auth.js";
import { authRoutes } from "./routes/v1/auth.js";
import { listingRoutes } from "./routes/v1/listings.js";
import { matchRoutes } from "./routes/v1/matches.js";
import { stripeWebhookRoute } from "./routes/v1/webhooks/stripe.js";
import { documentRoutes } from "./routes/v1/documents.js";
import { reviewRoutes } from "./routes/v1/reviews.js";
import { reportRoutes } from "./routes/v1/reports.js";
import { adminRoutes } from "./routes/v1/admin.js";

const app = Fastify({ logger: true });

const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL;
if (!allowedOrigin && process.env.NODE_ENV === "production") {
  throw new Error("NEXT_PUBLIC_APP_URL must be set in production");
}
app.register(cors, {
  origin: allowedOrigin || "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
});
app.register(helmet);
// Global rate limit: 200 req/min per IP (permissive default, tightened per-route where needed)
app.register(rateLimit, {
  global: true,
  max: 200,
  timeWindow: "1 minute",
  errorResponseBuilder: () => ({ error: "Too many requests, please try again later." }),
});
app.register(clerkAuthPlugin);

// Versioned routes
app.register(
  async (v1) => {
    v1.register(authRoutes);
    v1.register(listingRoutes);
    v1.register(matchRoutes);
    v1.register(stripeWebhookRoute);
    v1.register(documentRoutes);
    v1.register(reviewRoutes);
    v1.register(reportRoutes);
    v1.register(adminRoutes);
  },
  { prefix: "/v1" },
);

app.get("/health", async () => ({ status: "ok", service: "subletto-api" }));

const start = async () => {
  try {
    await app.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
