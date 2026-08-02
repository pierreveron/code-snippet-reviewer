let enabled = false;

/**
 * Register AI SDK DevTools telemetry once (local debug only).
 * Captures runs into `.devtools/generations.json` for the viewer UI.
 */
export async function enableReviewDevtools() {
  if (enabled || process.env.DEBUG_REVIEW !== "1") {
    return;
  }

  enabled = true;

  const [{ registerTelemetry }, { DevToolsTelemetry }] = await Promise.all([
    import("ai"),
    import("@ai-sdk/devtools"),
  ]);

  registerTelemetry(DevToolsTelemetry());
}
