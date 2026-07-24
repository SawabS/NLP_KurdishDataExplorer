import type { ReviewStatus } from "../../../api/types";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "outline";

/** One place mapping review status → label + non-colour-only badge, so the table
 *  and inspector never drift and status is never encoded by colour alone. */
export const STATUS_META: Record<ReviewStatus, {label: string; variant: BadgeVariant}> = {
  pending: {label: "Pending", variant: "outline"},
  draft: {label: "Draft", variant: "warning"},
  reviewed: {label: "Reviewed", variant: "success"},
  discarded: {label: "Discarded", variant: "danger"},
};
