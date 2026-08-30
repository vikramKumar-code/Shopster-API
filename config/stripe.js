import Stripe from "stripe";

// Fall back to a placeholder so the module can load in environments without a
// real key (dev boot, smoke tests). Any real Stripe API call will still fail
// loudly if STRIPE_SECRET_KEY is not a valid key.
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
);

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "[stripe] STRIPE_SECRET_KEY is not set — payment/refund calls will fail until it is configured.",
  );
}

export default stripe;
