import { api } from "./client";
import type { Interview } from "../types";

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
  list: (params?: { status?: string; company?: string }) =>
    api.get<Interview[]>("/api/interviews", { params }).then((r) => r.data),

  get: (id: string) => api.get<Interview>(`/api/interviews/${id}`).then((r) => r.data),

  create: (payload: InterviewPayload) =>
    api.post<Interview>("/api/interviews", payload).then((r) => r.data),

  update: (id: string, payload: Partial<InterviewPayload>) =>
    api.put<Interview>(`/api/interviews/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/api/interviews/${id}`),
};
