function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}
function validateStripeKey(key: string, name: string): string {
  if (!key.startsWith("sk_")) throw new Error(`${name} must start with sk_`);
  return key;
}
export type StripeAccount = "ps92" | "g93";

// APP_KEYS format: "appId:account:secretKey,appId:account:secretKey"
// Example: "portfolio:ps92:abc123,lyrist:ps92:def456,saffron:g93:xyz789"
export type AppKeyEntry = { appId: string; account: StripeAccount; key: string };

function parseAppKeys(): AppKeyEntry[] {
  const raw = required("APP_KEYS");
  return raw.split(",").map((entry) => {
    const [appId, account, key] = entry.trim().split(":");
    if (!appId || !account || !key) {
      throw new Error(`Invalid APP_KEYS format. Expected "appId:account:key", got "${entry}"`);
    }
    if (account !== "ps92" && account !== "g93") {
      throw new Error(`Invalid account "${account}" in APP_KEYS. Must be ps92 or g93`);
    }
    return { appId, account: account as StripeAccount, key };
  });
}

export const env = {
  get STRIPE_SECRET_KEY_PS92() {
    return validateStripeKey(required("STRIPE_SECRET_KEY_PS92"), "STRIPE_SECRET_KEY_PS92");
  },
  get STRIPE_SECRET_KEY_G93() {
    return validateStripeKey(required("STRIPE_SECRET_KEY_G93"), "STRIPE_SECRET_KEY_G93");
  },
  get APP_KEYS() {
    return parseAppKeys();
  },
};
