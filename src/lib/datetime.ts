/** Format timestamps in the user's local timezone (client-side). */
export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
