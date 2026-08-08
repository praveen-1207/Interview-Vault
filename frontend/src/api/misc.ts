// Misc endpoints: questions, AI feedback, analytics, and profile updates.
// Grouped here because they're smaller than the interview/auth modules.
import { api } from "./client";
import type { Question, Analytics, AIConfidence } from "../types";

export const questionApi = {
  // Search + filter the user's stored questions (Question Library page).
  search: (params?: { search?: string; company?: string; topic?: string; difficulty?: string; round_name?: string }) =>
    api.get<Question[]>("/api/questions", { params }).then((r) => r.data),

  // Add a question straight into a specific round of an interview.
  addToRound: (roundId: string, payload: { question: string; user_answer?: string; topic?: string; difficulty?: string }) =>
    api.post<Question>(`/api/questions/round/${roundId}`, payload).then((r) => r.data),

  // Add a question to an interview (auto-creates a "Round 1" if needed).
  addToInterview: (interviewId: string, payload: { question: string; user_answer?: string; topic?: string; difficulty?: string }) =>
    api.post<Question>(`/api/interviews/${interviewId}/questions`, payload).then((r) => r.data),

  // Edit an existing question (question text, answer, topic, difficulty).
  update: (id: string, payload: Partial<Question>) =>
    api.put<Question>(`/api/questions/${id}`, payload).then((r) => r.data),

  // Permanently delete a question.
  remove: (id: string) => api.delete(`/api/questions/${id}`),
};

export const aiApi = {
  // Quick, stateless AI feedback — nothing is saved. Used while typing an
  // answer ("Check answer with AI").
  generate: (question: string, user_answer: string) =>
    api.post("/api/ai/generate", { question, user_answer }).then((r) => r.data),

  // Generate AI feedback for a SAVED question and store it on that row.
  // Used by the "Generate" button on the Interview Detail page.
  generateAndSave: (questionId: string) =>
    api.post(`/api/ai/generate/${questionId}`).then((r) => r.data),

  // Score how confidently the candidate understood a SAVED question's answer.
  // The backend uses the stored question text + the user's saved answer + the
  // saved ai_correct_answer as the expected answer, and Gemini decides the
  // confidence level. Used by the "Check Confidence" button.
  generateConfidence: (questionId: string) =>
    api.post<AIConfidence>(`/api/ai/confidence/${questionId}`).then((r) => r.data),
};

export const analyticsApi = {
  // Fetch the pre-computed analytics summary for the Dashboard / AI Analysis.
  get: () => api.get<Analytics>("/api/analytics").then((r) => r.data),
};

export const userApi = {
  // Update the logged-in user's profile. All fields are optional (partial
  // update) — name, bio, occupation, target_role, location, linkedin, github.
  updateProfile: (payload: {
    name?: string;
    bio?: string;
    occupation?: string;
    target_role?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  }) => api.put("/api/users/me", payload).then((r) => r.data),
};
