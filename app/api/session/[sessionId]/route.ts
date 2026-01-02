import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { validateAppKey } from "@/lib/auth";
import type { ErrorResponse, SessionResponse } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = validateAppKey(request);
  if (!auth.ok) return auth.error;
  const { appId, account } = auth;

  const { sessionId } = await params;
  try {
    const stripe = getStripe(account);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer"],
    });

    // Ensure app can only access its own sessions
    if (!session.metadata?.sourceApp || session.metadata.sourceApp !== appId) {
      return NextResponse.json<ErrorResponse>({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json<SessionResponse>({
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email || null,
      amountTotal: session.amount_total,
      currency: session.currency,
      metadata: session.metadata as Record<string, string> | null,
      createdAt: new Date(session.created * 1000).toISOString(),
    });
  } catch {
    return NextResponse.json<ErrorResponse>({ error: "Session not found" }, { status: 404 });
  }
}
