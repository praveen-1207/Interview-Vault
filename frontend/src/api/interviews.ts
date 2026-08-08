// Interview endpoints: create, list, view, update, add rounds, and delete.
// Every method returns the raw JSON body (.data) so callers get typed objects.
import { api } from "./client";
import type {
  Interview,
  StatusUpdatesResponse,
  StatusUpdatePayload,
} from "../types";

// The shape of the request body when creating/updating an interview.
export interface InterviewPayload {
  company_name: string;
  role: string;
  interview_type?: string;
  date?: string;
  status?: string;
  confidence?: number;
  notes?: string;
  rounds?: {
    round_name: string;
    round_result?: string;
    questions?: { question: string; user_answer?: string; topic?: string; difficulty?: string }[];
  }[];
}

export const interviewApi = {
  // List all of the user's interviews, newest first. Optional filters:
  // `status` (AWAITING_RESULT/SELECTED/...) and `company` (name text).
  list: (params?: { status?: string; company?: string }) =>
    api.get<Interview[]>("/api/interviews", { params }).then((r) => r.data),

  // Fetch ONE interview with all its nested rounds + questions.
  get: (id: string) => api.get<Interview>(`/api/interviews/${id}`).then((r) => r.data),

  // Create a new interview (optionally with rounds and questions attached).
  create: (payload: InterviewPayload) =>
    api.post<Interview>("/api/interviews", payload).then((r) => r.data),

  // Update the details of an existing interview (partial update).
  update: (id: string, payload: Partial<InterviewPayload>) =>
    api.put<Interview>(`/api/interviews/${id}`, payload).then((r) => r.data),

  // Add a new round to an existing interview. round_name/round_result are
  // sent as query params (matching the backend endpoint).
  addRound: (id: string, payload: { round_name: string; round_result?: string }) =>
    api.post<Interview>(`/api/interviews/${id}/rounds`, null, { params: payload }).then((r) => r.data),

  // Permanently delete an interview (and everything nested inside it).
  remove: (id: string) => api.delete(`/api/interviews/${id}`),

  // Interviews currently needing a status update (the reminder flow). The
  // backend decides what is due, so this is the single source of truth.
  statusUpdates: () =>
    api.get<StatusUpdatesResponse>("/api/interviews/status-updates").then((r) => r.data),

  // Apply a status change (SELECTED / REJECTED / NEXT_ROUND / AWAITING_RESULT / ...).
  updateStatus: (id: string, payload: StatusUpdatePayload) =>
    api.patch<{ ok: boolean; interview: Interview }>(
      `/api/interviews/${id}/status`,
      payload,
    ).then((r) => r.data),

  // "Tell me later": delay the next reminder for this interview.
  snoozeStatusReminder: (id: string) =>
    api.post<{ ok: boolean; snoozed_until: string | null; days_waiting: number }>(
      `/api/interviews/${id}/snooze-status-reminder`,
    ).then((r) => r.data),
};
