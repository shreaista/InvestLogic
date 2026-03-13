/**
 * Production mode flag.
 * When true, sample/demo seed data is hidden from the UI.
 * Set NEXT_PUBLIC_PRODUCTION_MODE=true to enable, or "false" to disable in production.
 */
export const productionMode =
  process.env.NEXT_PUBLIC_PRODUCTION_MODE === "true" ||
  (process.env.NEXT_PUBLIC_PRODUCTION_MODE !== "false" &&
    process.env.NODE_ENV === "production");
