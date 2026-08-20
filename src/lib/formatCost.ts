/**
 * Format cost value in USD.
 * Centralized here so the future swap to credits (GO-23) is a single-file change.
 *
 * TODO: swap to credits when GET /v1/credits/balance exists (GO-23)
 */
export function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

/** Format a cost value as compact display (e.g., "$0.0042"). */
export function formatCostShort(usd: number): string {
  return `$${usd.toFixed(4)}`;
}
