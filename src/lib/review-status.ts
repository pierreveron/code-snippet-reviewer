import { ReviewStatus } from "@/generated/prisma/enums";

export type DisplayReviewStatus =
  | "not_reviewed"
  | "in_progress"
  | "reviewed"
  | "failed";

export function toDisplayReviewStatus(
  status: ReviewStatus | null,
): DisplayReviewStatus {
  if (status === null) return "not_reviewed";
  if (status === ReviewStatus.IN_PROGRESS) return "in_progress";
  if (status === ReviewStatus.COMPLETED) return "reviewed";
  return "failed";
}

export function reviewStatusLabel(status: DisplayReviewStatus): string {
  switch (status) {
    case "not_reviewed":
      return "Not reviewed";
    case "in_progress":
      return "In progress";
    case "reviewed":
      return "Reviewed";
    case "failed":
      return "Failed";
  }
}
