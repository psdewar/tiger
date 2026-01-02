import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { env, type StripeAccount } from "./env";

export type AuthResult =
  | { ok: true; appId: string; account: StripeAccount }
  | { ok: false; error: NextResponse };

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function validateAppKey(request: NextRequest): AuthResult {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Missing or malformed Authorization header" },
        { status: 401 }
      ),
    };
  }
  const providedKey = authHeader.slice(7);
  for (const entry of env.APP_KEYS) {
    if (safeCompare(entry.key, providedKey)) {
      return { ok: true, appId: entry.appId, account: entry.account };
    }
  }
  return { ok: false, error: NextResponse.json({ error: "Invalid APP_KEY" }, { status: 403 }) };
}
