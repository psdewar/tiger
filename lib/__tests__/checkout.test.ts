import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockStripeSession = {
  id: "cs_test_123",
  url: "https://checkout.stripe.com/test",
};

const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue(mockStripeSession),
    },
  },
};

vi.mock("@/lib/stripe", () => ({
  getStripe: () => mockStripe,
}));

vi.mock("@/lib/auth", () => ({
  validateAppKey: () => ({ ok: true, appId: "testapp", account: "ps92" }),
}));

import { POST } from "@/app/api/checkout/route";

function createRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripe.checkout.sessions.create.mockResolvedValue(mockStripeSession);
  });

  describe("validation", () => {
    it("rejects missing successUrl", async () => {
      const request = createRequest({
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("successUrl and cancelUrl are required");
    });

    it("rejects missing mode", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("mode is required (payment or subscription)");
    });

    it("rejects missing priceId and lineItems", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Either priceId or lineItems is required");
    });

    it("rejects line item with negative amount", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: -100 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Line item amountCents must be an integer >= 50");
    });

    it("rejects line item with amount below minimum", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: 49 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Line item amountCents must be an integer >= 50");
    });

    it("rejects line item with non-integer amount", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: 10.5 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Line item amountCents must be an integer >= 50");
    });

    it("rejects line item with zero quantity", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: 1000, quantity: 0 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Line item quantity must be a positive integer");
    });
  });

  describe("successful checkout", () => {
    it("creates checkout session with line items", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test Product", amountCents: 1999, quantity: 2 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.sessionId).toBe("cs_test_123");
      expect(body.url).toBe("https://checkout.stripe.com/test");

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          success_url: "https://example.com/success",
          cancel_url: "https://example.com/cancel",
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: "usd",
                unit_amount: 1999,
                product_data: expect.objectContaining({
                  name: "Test Product",
                }),
              }),
              quantity: 2,
            }),
          ],
          metadata: expect.objectContaining({
            sourceApp: "testapp",
          }),
        })
      );
    });

    it("creates checkout session with priceId", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "subscription",
        priceId: "price_123",
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          line_items: [{ price: "price_123", quantity: 1 }],
        })
      );
    });

    it("includes shipping options when provided", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Shirt", amountCents: 2999 }],
        shipping: {
          allowedCountries: ["US", "CA"],
          options: [{ displayName: "Standard", amountCents: 599 }],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shipping_address_collection: {
            allowed_countries: ["US", "CA"],
          },
          shipping_options: [
            expect.objectContaining({
              shipping_rate_data: expect.objectContaining({
                display_name: "Standard",
                fixed_amount: { amount: 599, currency: "usd" },
              }),
            }),
          ],
        })
      );
    });

    it("includes trial days for subscriptions", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "subscription",
        priceId: "price_123",
        trialDays: 14,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: { trial_period_days: 14 },
        })
      );
    });

    it("handles null session URL gracefully", async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_123",
        url: null,
      });

      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to generate checkout URL");
    });
  });

  describe("embedded checkout", () => {
    const embeddedSession = {
      id: "cs_test_emb",
      url: null,
      client_secret: "cs_test_emb_secret_abc",
    };

    beforeEach(() => {
      mockStripe.checkout.sessions.create.mockResolvedValue(embeddedSession);
    });

    it("returns clientSecret and url:null for embedded sessions", async () => {
      const request = createRequest({
        uiMode: "embedded",
        returnUrl: "https://peytspencer.com/return?session_id={CHECKOUT_SESSION_ID}",
        mode: "payment",
        lineItems: [{ name: "Test Product", amountCents: 1999 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.sessionId).toBe("cs_test_emb");
      expect(body.clientSecret).toBe("cs_test_emb_secret_abc");
      expect(body.url).toBeNull();
    });

    it("sets ui_mode embedded + return_url and omits success/cancel urls", async () => {
      const request = createRequest({
        uiMode: "embedded",
        returnUrl: "https://peytspencer.com/return",
        // success/cancel are ignored for embedded even when a caller sends them
        successUrl: "https://peytspencer.com/success",
        cancelUrl: "https://peytspencer.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test Product", amountCents: 1999 }],
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const params = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(params.ui_mode).toBe("embedded");
      expect(params.return_url).toBe("https://peytspencer.com/return");
      expect(params.redirect_on_completion).toBeUndefined();
      expect(params.success_url).toBeUndefined();
      expect(params.cancel_url).toBeUndefined();
    });

    it("preserves shared params (line_items, metadata, phone, email) in embedded mode", async () => {
      const request = createRequest({
        uiMode: "embedded",
        returnUrl: "https://peytspencer.com/return",
        mode: "payment",
        lineItems: [{ name: "Test Product", amountCents: 1999, quantity: 2 }],
        customerEmail: "buyer@example.com",
        collectPhone: true,
        metadata: { orderId: "42" },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          customer_email: "buyer@example.com",
          phone_number_collection: { enabled: true },
          metadata: expect.objectContaining({ orderId: "42", sourceApp: "testapp" }),
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({ unit_amount: 1999 }),
              quantity: 2,
            }),
          ],
        })
      );
    });

    it("completes inline (redirect_on_completion: never) when returnUrl is absent", async () => {
      const request = createRequest({
        uiMode: "embedded",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.clientSecret).toBe("cs_test_emb_secret_abc");
      expect(body.url).toBeNull();

      const params = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(params.ui_mode).toBe("embedded");
      expect(params.redirect_on_completion).toBe("never");
      expect(params.return_url).toBeUndefined();
      expect(params.success_url).toBeUndefined();
      expect(params.cancel_url).toBeUndefined();
    });

    it("returns 500 when Stripe omits the client_secret", async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_emb",
        url: null,
        client_secret: null,
      });

      const request = createRequest({
        uiMode: "embedded",
        returnUrl: "https://peytspencer.com/return",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("Failed to generate checkout client secret");
    });
  });

  describe("hosted checkout (backward compatibility)", () => {
    it("defaults to hosted when uiMode is omitted: sets success/cancel, no ui_mode, returns url", async () => {
      const request = createRequest({
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.url).toBe("https://checkout.stripe.com/test");
      expect(body.clientSecret).toBeUndefined();

      const params = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(params.success_url).toBe("https://example.com/success");
      expect(params.cancel_url).toBe("https://example.com/cancel");
      expect(params.ui_mode).toBeUndefined();
      expect(params.return_url).toBeUndefined();
    });

    it("treats explicit uiMode 'hosted' the same as omitted", async () => {
      const request = createRequest({
        uiMode: "hosted",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        mode: "payment",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.url).toBe("https://checkout.stripe.com/test");

      const params = mockStripe.checkout.sessions.create.mock.calls[0][0];
      expect(params.ui_mode).toBeUndefined();
    });
  });
});
