import type Stripe from "stripe";

export interface LineItem {
  name: string;
  description?: string;
  amountCents: number;
  quantity?: number;
  images?: string[];
}

export interface ShippingOption {
  amountCents: number;
  displayName: string;
  deliveryEstimate?: {
    minimum: { unit: "business_day" | "day" | "week"; value: number };
    maximum: { unit: "business_day" | "day" | "week"; value: number };
  };
}

export interface CreateCheckoutRequest {
  successUrl: string;
  cancelUrl: string;
  priceId?: string;
  lineItems?: LineItem[];
  mode: "payment" | "subscription";
  customerEmail?: string;
  trialDays?: number;
  expiresInMinutes?: number;
  metadata?: Record<string, string>;
  shipping?: {
    allowedCountries: string[];
    options?: ShippingOption[];
  };
  collectPhone?: boolean;
  /** "hosted" (default) redirects to Stripe; "embedded" stays on the consumer's page. */
  uiMode?: "hosted" | "embedded";
  /**
   * Optional for embedded checkout. With it, Stripe redirects here on completion;
   * without it, embedded completes inline (redirect_on_completion: "never").
   */
  returnUrl?: string;
}

export interface CreateCheckoutResponse {
  sessionId: string;
  /** Hosted redirect URL. Null for embedded checkout. */
  url: string | null;
  /** Present only for embedded checkout; pass to Stripe's EmbeddedCheckout on the client. */
  clientSecret?: string;
}

export interface SessionResponse {
  id: string;
  status: Stripe.Checkout.Session.Status | null;
  paymentStatus: Stripe.Checkout.Session.PaymentStatus;
  customerEmail: string | null;
  amountTotal: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
}
