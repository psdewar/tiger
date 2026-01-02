# Tiger

Stripe checkout proxy. Configure Stripe once, use it from any project.

## Setup

1. Deploy to Vercel
2. Set environment variables:

```
STRIPE_SECRET_KEY_PS92=sk_test_xxx
STRIPE_SECRET_KEY_G93=sk_test_xxx
APP_KEYS=myapp:ps92:secret123,otherapp:g93:secret456
```

3. Generate app secrets with: `openssl rand -base64 32`

## Using from other projects

Install the client:

```bash
npm install github:psdewar/tiger
```

Set environment variable in your app:

```
TIGER_APP_KEY=your_app_secret
```

Use it:

```typescript
import { createTigerClient } from "tiger-client";

const tiger = createTigerClient({
  appKey: process.env.TIGER_APP_KEY!,
});

const { url } = await tiger.checkout({
  mode: "payment",
  lineItems: [{ name: "Pro Plan", amountCents: 1999, quantity: 1 }],
  successUrl: "https://yourapp.com/success",  // your app's URL
  cancelUrl: "https://yourapp.com/cart",       // your app's URL
});

// Redirect user to `url`
```

## Local development

Just use production Tiger - no need to run it locally:

```typescript
const tiger = createTigerClient({
  appKey: process.env.TIGER_APP_KEY!,
});
```

To override (rare): pass `baseUrl` to point to a different Tiger instance.

## API

### POST /api/checkout

Create a Stripe checkout session.

```typescript
{
  mode: "payment" | "subscription",
  successUrl: string,
  cancelUrl: string,
  lineItems?: [{ name: string, amountCents: number, quantity?: number }],
  priceId?: string,  // alternative to lineItems (for subscriptions)
  customerEmail?: string,
  metadata?: Record<string, string>,
  trialDays?: number,
  collectPhone?: boolean,
  expiresInMinutes?: number,
  shipping?: {
    allowedCountries: string[],
    options?: [{ displayName: string, amountCents: number }]
  }
}
```

### GET /api/session/:sessionId

Get checkout session details.

### GET /api/health

Health check (no auth required).
