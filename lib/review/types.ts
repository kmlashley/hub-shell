export type ReviewStatus = "ready" | "approved" | "rejected" | "redirected" | "published";
export type OutputType = "brief" | "draft" | "social_post" | "research" | "analysis" | "other";

export interface ReviewItem {
  id: string;
  agent_id: string | null;
  output_type: OutputType;
  title: string;
  payload: Record<string, unknown>;
  status: ReviewStatus;
  priority_score: number;
  human_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type FeedbackAction = "approve" | "reject" | "redirect";

export interface FeedbackPayload {
  id: string;
  action: FeedbackAction;
  notes?: string;
  route_to?: string;
}
