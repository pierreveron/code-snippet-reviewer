/**
 * Register AI SDK DevTools telemetry when AI_SDK_DEVTOOLS=1.
 * Captures runs into `.devtools/generations.json` for the viewer UI.
 * DevTools are local-only — never register them in production builds.
 */
export async function enableReviewDevtools() {
  if (
    process.env.AI_SDK_DEVTOOLS !== "1" ||
    process.env.NODE_ENV === "production"
  ) {
    return;
  }

  const [{ registerTelemetry }, { DevToolsTelemetry }] = await Promise.all([
    import("ai"),
    import("@ai-sdk/devtools"),
  ]);

  registerTelemetry(DevToolsTelemetry());
}
