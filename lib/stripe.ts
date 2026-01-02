import "server-only";
import Stripe from "stripe";
import { env, type StripeAccount } from "./env";

const stripeConfig: Stripe.StripeConfig = { apiVersion: "2025-12-15.clover", typescript: true };
const clients: Partial<Record<StripeAccount, Stripe>> = {};

export function getStripe(account: StripeAccount): Stripe {
  if (!clients[account]) {
    const key = account === "ps92" ? env.STRIPE_SECRET_KEY_PS92 : env.STRIPE_SECRET_KEY_G93;
    clients[account] = new Stripe(key, stripeConfig);
  }
  return clients[account]!;
}
