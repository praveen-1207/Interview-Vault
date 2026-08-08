// =========================================================
// Shared TypeScript types — the single source of truth for the data shapes
// the frontend receives from the backend. Every API module and page imports
// these, so if the backend response changes, we fix it in ONE place.
// =========================================================

// A registered user's profile (matches the backend's UserOut schema).
// `password_hash` is deliberately absent — the API never sends it.
// The career/social fields (occupation, target_role, location, linkedin,
// github) are optional and edited on the Settings page.
export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string | null;
  occupation?: string | null;
  target_role?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  created_at: string;
}

// A single interview question, including the AI feedback fields that are
// null until the "Generate" button has been pressed at least once.
export interface Question {
  id: string;
  round_id: string;
  question: string;
  user_answer: string | null;
  ai_correct_answer: string | null;
  ai_improved_answer: string | null;
  ai_explanation: string | null;
  ai_missing_points: string | null;
  topic: string | null;
  difficulty: string | null;
  created_at: string;
}

// A round (stage) inside an interview. Holds the list of questions asked
// during that round, so the detail page can render them grouped by round.
export interface Round {
  id: string;
  interview_id: string;
  round_name: string;
  round_result: string | null;
  order_index: number;
  questions: Question[];
}

// The statuses an interview can be in. The canonical (uppercase) values drive
// the lifecycle UI; legacy lowercase values (`pending`/`waiting`) are kept so
// the backend can still normalize old rows.
export type InterviewStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_COMPLETED"
  | "AWAITING_RESULT"
  | "SELECTED"
  | "REJECTED"
  | "NEXT_ROUND"
  | "NO_RESPONSE"
  | "pending"
  | "waiting";

// A full interview record. `status` is a closed union of the values the
// backend defines (not a free-form string), which lets TypeScript catch typos
// at compile time. The reminder fields power the follow-up status reminders.
export interface Interview {
  id: string;
  user_id: string;
  company_name: string;
  role: string;
  interview_type: string | null;
  date: string | null;
  status: InterviewStatus;
  confidence: number;
  notes: string | null;
  status_updated_at: string | null;
  interview_completed_at: string | null;
  next_reminder_at: string | null;
  last_reminder_at: string | null;
  reminder_count: number;
  reminder_snoozed_until: string | null;
  days_waiting: number;
  reminder_type: "FOLLOW_UP" | "NO_RESPONSE";
  created_at: string;
  rounds: Round[];
}

// The pre-computed analytics summary used by Dashboard & AI Analysis pages.
// The `company_distribution` and `monthly_activity` maps use string keys
// (company name / "YYYY-MM") mapped to counts. `needs_attention` is the live
// count of interviews waiting for a status update.
export interface Analytics {
  total_interviews: number;
  selected: number;
  waiting: number;
  rejected: number;
  pending: number;
  awaiting_result: number;
  next_round: number;
  no_response: number;
  needs_attention: number;
  avg_confidence: number;
  company_distribution: Record<string, number>;
  monthly_activity: Record<string, number>;
}

// One interview in the "status update" reminder list. The backend decides
// which interviews need attention and what kind of reminder applies.
export interface StatusUpdateItem {
  id: string;
  company_name: string;
  role: string;
  status: InterviewStatus;
  days_waiting: number;
  reminder_type: "FOLLOW_UP" | "NO_RESPONSE";
  interview_completed_at: string | null;
}

// The response from GET /api/interviews/status-updates.
export interface StatusUpdatesResponse {
  count: number;
  interviews: StatusUpdateItem[];
}

// Body for PATCH /api/interviews/{id}/status. For NEXT_ROUND an optional
// `next_round` label is sent; a default is used when omitted.
export interface StatusUpdatePayload {
  status: InterviewStatus;
  next_round?: string;
}

// The response body from register/login/refresh — two JWTs plus the user.
// The tokens are stored in localStorage so the session survives page reloads.
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// The AI confidence-scoring result. `confidence_score` is an integer 0-10,
// `confidence_level` is the label decided by the AI model (Very Low / Low /
// Moderate / Good / Excellent), and the rest is detailed feedback.
export interface AIConfidence {
  confidence_score: number;
  confidence_level: string;
  reason: string;
  strengths: string[];
  weaknesses: string[];
  improvement: string;
}
