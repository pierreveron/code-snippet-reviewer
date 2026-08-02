import {
  reviewStatusLabel,
  toDisplayReviewStatus,
  type DisplayReviewStatus,
} from "@/lib/review-status";
import type { ReviewStatus } from "@/generated/prisma/enums";

const badgeStyles: Record<DisplayReviewStatus, string> = {
  not_reviewed: "bg-slate-100 text-slate-600 ring-slate-200/80",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-200/80",
  reviewed: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  failed: "bg-rose-50 text-rose-800 ring-rose-200/80",
};

const dotStyles: Record<DisplayReviewStatus, string> = {
  not_reviewed: "bg-slate-400",
  in_progress: "bg-amber-500",
  reviewed: "bg-emerald-500",
  failed: "bg-rose-500",
};

type ReviewStatusBadgeProps = {
  status: ReviewStatus | null;
};

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const display = toDisplayReviewStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeStyles[display]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[display]}`} />
      {reviewStatusLabel(display)}
    </span>
  );
}
