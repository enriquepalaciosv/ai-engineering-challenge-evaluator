import { pathToFileURL } from "node:url";
import path from "node:path";
import type { HiddenCaseResult } from "../src/types.js";

const challengeRoot = process.argv[2];
if (!challengeRoot) {
  throw new Error("Usage: run-hidden.ts <challenge-checkout-root>");
}

const pricingModule = await import(
  pathToFileURL(path.join(challengeRoot, "src", "pricing.ts")).href
);
const { priceOrder } = pricingModule as {
  priceOrder: (order: Order, promotion?: Promotion) => PriceBreakdown;
};

type Order = {
  customerTier: "STANDARD" | "PREMIUM";
  shippingMethod: "STANDARD" | "EXPRESS";
  items: Array<{ sku: string; unitPrice: number; quantity: number }>;
};
type Promotion =
  | { type: "PERCENT"; value: number }
  | { type: "FIXED"; value: number };
type PriceBreakdown = {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
};

const results: HiddenCaseResult[] = [];

function check(id: string, title: string, run: () => void): void {
  try {
    run();
    results.push({ id, title, passed: true });
  } catch (error) {
    results.push({
      id,
      title,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function expectEqual(actual: unknown, expected: unknown, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function order(
  amount: number,
  customerTier: Order["customerTier"] = "STANDARD",
  shippingMethod: Order["shippingMethod"] = "STANDARD",
): Order {
  return {
    customerTier,
    shippingMethod,
    items: [{ sku: "hidden-item", unitPrice: amount, quantity: 1 }],
  };
}

check("percent-merchandise-only", "Percentage promotions exclude shipping from their basis", () => {
  const result = priceOrder(order(30), { type: "PERCENT", value: 10 } satisfies Promotion);
  expectEqual(result.discount, 3, "discount");
  expectEqual(result.shipping, 5, "shipping");
  expectEqual(result.total, 34.7, "total");
});

check("premium-threshold-exact", "PREMIUM standard shipping becomes free at exactly $50 after promotion", () => {
  const result = priceOrder(order(60, "PREMIUM", "STANDARD"), { type: "FIXED", value: 10 });
  expectEqual(result.shipping, 0, "shipping");
  expectEqual(result.total, 55, "total");
});

check("premium-below-threshold", "PREMIUM benefit does not apply below $50 after promotion", () => {
  const result = priceOrder(order(60, "PREMIUM", "STANDARD"), { type: "FIXED", value: 10.01 });
  expectEqual(result.shipping, 5, "shipping");
  expectEqual(result.total, 59.99, "total");
});

check("premium-express", "PREMIUM benefit never makes EXPRESS shipping free", () => {
  const result = priceOrder(order(80, "PREMIUM", "EXPRESS"));
  expectEqual(result.shipping, 12, "shipping");
  expectEqual(result.total, 100, "total");
});

check("standard-unaffected", "STANDARD customers keep existing standard-shipping behavior", () => {
  const result = priceOrder(order(60, "STANDARD", "STANDARD"));
  expectEqual(result.shipping, 5, "shipping");
  expectEqual(result.total, 71, "total");
});

check("percent-premium-combination", "Percentage promotion and PREMIUM benefit compose using discounted merchandise", () => {
  const result = priceOrder(order(55, "PREMIUM", "STANDARD"), { type: "PERCENT", value: 10 });
  expectEqual(result.discount, 5.5, "discount");
  expectEqual(result.shipping, 5, "shipping");
  expectEqual(result.total, 59.45, "total");
});

check("fixed-discount-cap", "Fixed promotions remain capped at merchandise subtotal", () => {
  const result = priceOrder(order(20), { type: "FIXED", value: 100 });
  expectEqual(result.discount, 20, "discount");
  expectEqual(result.total, 8, "total");
});

check("percentage-tax-basis", "Tax remains based on discounted merchandise only", () => {
  const result = priceOrder(order(100, "STANDARD", "EXPRESS"), { type: "PERCENT", value: 25 });
  expectEqual(result.discount, 25, "discount");
  expectEqual(result.tax, 7.5, "tax");
  expectEqual(result.total, 94.5, "total");
});

process.stdout.write(JSON.stringify({ results }));
