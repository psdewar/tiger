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
        minimum: {
            unit: "business_day" | "day" | "week";
            value: number;
        };
        maximum: {
            unit: "business_day" | "day" | "week";
            value: number;
        };
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
    /** "hosted" (default) redirects to Stripe; "embedded" keeps the buyer on your page. */
    uiMode?: "hosted" | "embedded";
    /**
     * Optional for embedded checkout. With it, Stripe redirects here on completion;
     * without it, embedded completes inline and you handle it via onComplete.
     */
    returnUrl?: string;
}
export interface CheckoutResponse {
    sessionId: string;
    /** Hosted redirect URL. Null for embedded checkout. */
    url: string | null;
    /** Present only for embedded checkout; pass to Stripe's EmbeddedCheckout on the client. */
    clientSecret?: string;
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
export declare function createTigerClient(config: TigerClientConfig): TigerClient;
