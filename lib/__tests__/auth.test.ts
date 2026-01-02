import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../env", () => ({
  env: {
    APP_KEYS: [
      { appId: "testapp", account: "ps92", key: "test-secret-key-123" },
      { appId: "otherapp", account: "g93", key: "other-secret-key-456" },
    ],
  },
}));

import { validateAppKey } from "../auth";

function createRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("validateAppKey", () => {
  describe("missing or malformed auth header", () => {
    it("rejects request without Authorization header", async () => {
      const request = createRequest();
      const result = validateAppKey(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const body = await result.error.json();
        expect(body.error).toBe("Missing or malformed Authorization header");
        expect(result.error.status).toBe(401);
      }
    });

    it("rejects request with non-Bearer auth", async () => {
      const request = createRequest("Basic abc123");
      const result = validateAppKey(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(401);
      }
    });

    it("rejects request with empty Bearer token", async () => {
      const request = createRequest("Bearer ");
      const result = validateAppKey(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(401);
      }
    });
  });

  describe("valid auth header", () => {
    it("accepts valid app key and returns correct app info", () => {
      const request = createRequest("Bearer test-secret-key-123");
      const result = validateAppKey(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.appId).toBe("testapp");
        expect(result.account).toBe("ps92");
      }
    });

    it("accepts different valid app key", () => {
      const request = createRequest("Bearer other-secret-key-456");
      const result = validateAppKey(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.appId).toBe("otherapp");
        expect(result.account).toBe("g93");
      }
    });

    it("rejects invalid app key", async () => {
      const request = createRequest("Bearer wrong-key");
      const result = validateAppKey(request);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const body = await result.error.json();
        expect(body.error).toBe("Invalid APP_KEY");
        expect(result.error.status).toBe(403);
      }
    });

    it("rejects key that is close but not exact", async () => {
      const request = createRequest("Bearer test-secret-key-12");
      const result = validateAppKey(request);

      expect(result.ok).toBe(false);
    });

    it("rejects key with extra characters", async () => {
      const request = createRequest("Bearer test-secret-key-123extra");
      const result = validateAppKey(request);

      expect(result.ok).toBe(false);
    });
  });
});
