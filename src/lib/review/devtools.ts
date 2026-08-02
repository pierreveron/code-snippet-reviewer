/**
 * Register AI SDK DevTools telemetry when AI_SDK_DEVTOOLS=1.
 * Captures runs into `.devtools/generations.json` for the viewer UI.
 */
export async function enableReviewDevtools() {
  if (process.env.AI_SDK_DEVTOOLS !== "1") {
    return;
  }

  const [{ registerTelemetry }, { DevToolsTelemetry }] = await Promise.all([
    import("ai"),
    import("@ai-sdk/devtools"),
  ]);

  registerTelemetry(DevToolsTelemetry());
}
