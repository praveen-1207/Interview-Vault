export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string | null;
  created_at: string;
}

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

export interface Round {
  id: string;
  interview_id: string;
  round_name: string;
  round_result: string | null;
  order_index: number;
  questions: Question[];
}

export interface Interview {
  id: string;
  user_id: string;
  company_name: string;
  role: string;
  interview_type: string | null;
  date: string | null;
  status: "selected" | "waiting" | "rejected" | "pending";
  confidence: number;
  notes: string | null;
  created_at: string;
  rounds: Round[];
}

export interface Analytics {
  total_interviews: number;
  selected: number;
  waiting: number;
  rejected: number;
  pending: number;
  avg_confidence: number;
  company_distribution: Record<string, number>;
  monthly_activity: Record<string, number>;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}
