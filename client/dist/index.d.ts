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
export declare function createTigerClient(config: TigerClientConfig): TigerClient;
