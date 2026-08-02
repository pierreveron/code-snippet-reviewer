import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-16 sm:px-6 sm:py-20">
      <div className="w-full rounded-2xl border border-dashed border-border-strong bg-surface/70 px-6 py-20 text-center shadow-[var(--shadow)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft font-mono text-sm font-semibold text-accent">
          404
        </div>
        <h1 className="text-lg font-semibold text-foreground">
          Page not found
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          This snippet or page doesn&apos;t exist — it may have been removed, or
          the link is mistyped.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back to snippets
          </Link>
        </div>
      </div>
    </div>
  );
}
