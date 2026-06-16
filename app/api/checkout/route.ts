import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { validateAppKey } from "@/lib/auth";
import type {
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  ErrorResponse,
  LineItem,
  ShippingOption,
} from "@/lib/types";

const bad = (msg: string, status = 400) =>
  NextResponse.json<ErrorResponse>({ error: msg }, { status });

function buildLineItems(
  req: CreateCheckoutRequest
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  // Option 1: Preconfigured price
  if (req.priceId) {
    return [{ price: req.priceId, quantity: 1 }];
  }

  // Option 2: Custom line items
  if (req.lineItems?.length) {
    return req.lineItems.map((item: LineItem) => ({
      price_data: {
        currency: "usd",
        unit_amount: item.amountCents,
        product_data: {
          name: item.name,
          ...(item.description && { description: item.description }),
          ...(item.images?.length && { images: item.images }),
        },
      },
      quantity: item.quantity || 1,
    }));
  }

  return [];
}

function buildShippingOptions(
  options: ShippingOption[]
): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  return options.map((opt) => ({
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: { amount: opt.amountCents, currency: "usd" },
      display_name: opt.displayName,
      ...(opt.deliveryEstimate && {
        delivery_estimate: {
          minimum: opt.deliveryEstimate.minimum,
          maximum: opt.deliveryEstimate.maximum,
        },
      }),
    },
  }));
}

export async function POST(request: NextRequest) {
  const auth = validateAppKey(request);
  if (!auth.ok) return auth.error;
  const { appId, account } = auth;

  try {
    const body = (await request.json()) as CreateCheckoutRequest;

    const uiMode = body.uiMode || "hosted";

    // Validate required fields. Embedded needs neither success/cancel nor
    // return_url: with a return_url it redirects on success, without one it
    // completes inline (redirect_on_completion: "never").
    if (uiMode !== "embedded" && (!body.successUrl || !body.cancelUrl)) {
      return bad("successUrl and cancelUrl are required");
    }
    if (!body.mode) {
      return bad("mode is required (payment or subscription)");
    }
    if (!body.priceId && !body.lineItems?.length) {
      return bad("Either priceId or lineItems is required");
    }

    // Validate line item amounts
    if (body.lineItems) {
      for (const item of body.lineItems) {
        if (!Number.isInteger(item.amountCents) || item.amountCents < 50) {
          return bad("Line item amountCents must be an integer >= 50");
        }
        if (item.quantity !== undefined && (!Number.isInteger(item.quantity) || item.quantity < 1)) {
          return bad("Line item quantity must be a positive integer");
        }
      }
    }

    const lineItems = buildLineItems(body);
    if (!lineItems.length) {
      return bad("No valid line items");
    }

    // Build session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: body.mode,
      line_items: lineItems,
      payment_method_types: ["card"],
      expires_at: Math.floor(Date.now() / 1000) + (body.expiresInMinutes || 30) * 60,
    };

    if (uiMode === "embedded") {
      // Stripe rejects success_url/cancel_url alongside embedded. With a
      // return_url Stripe redirects on completion; without one it stays inline
      // and the consumer handles completion via the onComplete callback.
      sessionParams.ui_mode = "embedded";
      if (body.returnUrl) {
        sessionParams.return_url = body.returnUrl;
      } else {
        sessionParams.redirect_on_completion = "never";
      }
    } else {
      sessionParams.success_url = body.successUrl;
      sessionParams.cancel_url = body.cancelUrl;
    }

    // Metadata
    if (body.metadata) {
      sessionParams.metadata = { ...body.metadata, sourceApp: appId };
    } else {
      sessionParams.metadata = { sourceApp: appId };
    }

    // Customer email
    if (body.customerEmail) {
      sessionParams.customer_email = body.customerEmail;
    }

    // Subscription trial
    if (body.mode === "subscription" && body.trialDays) {
      sessionParams.subscription_data = { trial_period_days: body.trialDays };
    }

    // Shipping
    if (body.shipping) {
      sessionParams.shipping_address_collection = {
        allowed_countries: body.shipping
          .allowedCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      };
      if (body.shipping.options?.length) {
        sessionParams.shipping_options = buildShippingOptions(body.shipping.options);
      }
    }

    // Phone collection
    if (body.collectPhone) {
      sessionParams.phone_number_collection = { enabled: true };
    }

    const stripe = getStripe(account);
    const session = await stripe.checkout.sessions.create(sessionParams);

    if (uiMode === "embedded") {
      if (!session.client_secret) {
        return bad("Failed to generate checkout client secret", 500);
      }
      return NextResponse.json<CreateCheckoutResponse>({
        sessionId: session.id,
        clientSecret: session.client_secret,
        url: null,
      });
    }

    if (!session.url) {
      return bad("Failed to generate checkout URL", 500);
    }

    return NextResponse.json<CreateCheckoutResponse>({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("[checkout]", error);
    if (error instanceof SyntaxError) return bad("Invalid JSON body");
    return bad("Failed to create checkout session", 500);
  }
}
