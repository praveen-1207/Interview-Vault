import { api } from "./client";
import type { Question, Analytics } from "../types";

export const questionApi = {
  search: (params?: { search?: string; company?: string; topic?: string; difficulty?: string; round_name?: string }) =>
    api.get<Question[]>("/api/questions", { params }).then((r) => r.data),

  addToRound: (roundId: string, payload: { question: string; user_answer?: string; topic?: string; difficulty?: string }) =>
    api.post<Question>(`/api/questions/round/${roundId}`, payload).then((r) => r.data),

  addToInterview: (interviewId: string, payload: { question: string; user_answer?: string; topic?: string; difficulty?: string }) =>
    api.post<Question>(`/api/interviews/${interviewId}/questions`, payload).then((r) => r.data),

  update: (id: string, payload: Partial<Question>) =>
    api.put<Question>(`/api/questions/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/api/questions/${id}`),
};

export const aiApi = {
  generate: (question: string, user_answer: string) =>
    api.post("/api/ai/generate", { question, user_answer }).then((r) => r.data),

  generateAndSave: (questionId: string) =>
    api.post(`/api/ai/generate/${questionId}`).then((r) => r.data),
};

export const analyticsApi = {
  get: () => api.get<Analytics>("/api/analytics").then((r) => r.data),
};

export const userApi = {
  updateProfile: (payload: { name?: string; bio?: string }) =>
    api.put("/api/users/me", payload).then((r) => r.data),
};
