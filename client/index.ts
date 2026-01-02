export interface LineItem {
  name: string;
  amountCents: number;
  quantity?: number;
  description?: string;
  images?: string[];
}

export interface ShippingOption {
  displayName: string;
  amountCents: number;
  deliveryEstimate?: {
    minimum: { unit: "business_day" | "day" | "week"; value: number };
    maximum: { unit: "business_day" | "day" | "week"; value: number };
  };
}

export interface CheckoutRequest {
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  priceId?: string;
  lineItems?: LineItem[];
  metadata?: Record<string, string>;
  customerEmail?: string;
  trialDays?: number;
  shipping?: {
    allowedCountries: string[];
    options?: ShippingOption[];
  };
  collectPhone?: boolean;
  expiresInMinutes?: number;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

export interface SessionResponse {
  id: string;
  status: string | null;
  paymentStatus: string;
  customerEmail: string | null;
  amountTotal: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
}

export interface TigerClientConfig {
  appKey: string;
  baseUrl?: string;
}

export interface TigerClient {
  checkout: (request: CheckoutRequest) => Promise<CheckoutResponse>;
  getSession: (sessionId: string) => Promise<SessionResponse>;
}

export function createTigerClient(config: TigerClientConfig): TigerClient {
  const baseUrl = (config.baseUrl || "https://tiger-three.vercel.app").replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.appKey}`,
  };

  return {
    async checkout(request: CheckoutRequest): Promise<CheckoutResponse> {
      const res = await fetch(`${baseUrl}/api/checkout`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const error = (await res.json().catch(() => ({ error: "Unknown error" }))) as {
          error?: string;
        };
        throw new Error(error.error || `Tiger checkout failed: ${res.status}`);
      }

      return res.json() as Promise<CheckoutResponse>;
    },

    async getSession(sessionId: string): Promise<SessionResponse> {
      const res = await fetch(`${baseUrl}/api/session/${sessionId}`, { headers });

      if (!res.ok) {
        const error = (await res.json().catch(() => ({ error: "Unknown error" }))) as {
          error?: string;
        };
        throw new Error(error.error || `Tiger session fetch failed: ${res.status}`);
      }

      return res.json() as Promise<SessionResponse>;
    },
  };
}
