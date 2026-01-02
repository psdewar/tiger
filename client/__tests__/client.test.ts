import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTigerClient } from "../index";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TigerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTigerClient", () => {
    it("uses default baseUrl when not provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "cs_123", url: "https://checkout.stripe.com" }),
      });

      const client = createTigerClient({ appKey: "test-key" });
      await client.checkout({
        mode: "payment",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://tiger.vercel.app/api/checkout",
        expect.any(Object)
      );
    });

    it("uses custom baseUrl when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "cs_123", url: "https://checkout.stripe.com" }),
      });

      const client = createTigerClient({
        appKey: "test-key",
        baseUrl: "https://my-tiger.vercel.app",
      });
      await client.checkout({
        mode: "payment",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://my-tiger.vercel.app/api/checkout",
        expect.any(Object)
      );
    });

    it("strips trailing slash from baseUrl", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "cs_123", url: "https://checkout.stripe.com" }),
      });

      const client = createTigerClient({
        appKey: "test-key",
        baseUrl: "https://my-tiger.vercel.app/",
      });
      await client.checkout({
        mode: "payment",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://my-tiger.vercel.app/api/checkout",
        expect.any(Object)
      );
    });
  });

  describe("checkout", () => {
    it("sends correct headers and body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: "cs_123", url: "https://checkout.stripe.com" }),
      });

      const client = createTigerClient({ appKey: "my-secret-key" });
      await client.checkout({
        mode: "payment",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        lineItems: [{ name: "Product", amountCents: 2999, quantity: 2 }],
        customerEmail: "test@example.com",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer my-secret-key",
          },
          body: JSON.stringify({
            mode: "payment",
            successUrl: "https://example.com/success",
            cancelUrl: "https://example.com/cancel",
            lineItems: [{ name: "Product", amountCents: 2999, quantity: 2 }],
            customerEmail: "test@example.com",
          }),
        })
      );
    });

    it("returns sessionId and url on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            sessionId: "cs_test_abc123",
            url: "https://checkout.stripe.com/pay/cs_test_abc123",
          }),
      });

      const client = createTigerClient({ appKey: "test-key" });
      const result = await client.checkout({
        mode: "payment",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        lineItems: [{ name: "Test", amountCents: 1000 }],
      });

      expect(result.sessionId).toBe("cs_test_abc123");
      expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_abc123");
    });

    it("throws error with message from API on failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Line item amountCents must be an integer >= 50" }),
      });

      const client = createTigerClient({ appKey: "test-key" });

      await expect(
        client.checkout({
          mode: "payment",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
          lineItems: [{ name: "Test", amountCents: 10 }],
        })
      ).rejects.toThrow("Line item amountCents must be an integer >= 50");
    });

    it("throws generic error when API returns no error message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const client = createTigerClient({ appKey: "test-key" });

      // When JSON parsing fails, client uses "Unknown error" as fallback
      await expect(
        client.checkout({
          mode: "payment",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
          lineItems: [{ name: "Test", amountCents: 1000 }],
        })
      ).rejects.toThrow("Unknown error");
    });
  });

  describe("getSession", () => {
    it("fetches session with correct URL and headers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "cs_test_123",
            status: "complete",
            paymentStatus: "paid",
            customerEmail: "test@example.com",
            amountTotal: 2999,
            currency: "usd",
            metadata: { orderId: "123" },
            createdAt: "2024-01-01T00:00:00.000Z",
          }),
      });

      const client = createTigerClient({ appKey: "my-key" });
      const session = await client.getSession("cs_test_123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://tiger.vercel.app/api/session/cs_test_123",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer my-key",
          },
        })
      );

      expect(session.id).toBe("cs_test_123");
      expect(session.paymentStatus).toBe("paid");
      expect(session.amountTotal).toBe(2999);
    });

    it("throws error when session not found", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Session not found" }),
      });

      const client = createTigerClient({ appKey: "test-key" });

      await expect(client.getSession("cs_invalid")).rejects.toThrow("Session not found");
    });
  });
});
