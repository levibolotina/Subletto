import Stripe from "stripe";

// Server-only Stripe client — never import this in Client Components
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});
