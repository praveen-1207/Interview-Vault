import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { Card, Input, Label, Button } from "../components/ui";
import { interviewApi } from "../api/interviews";
import AIAnswerCheck from "../components/AIAnswerCheck";

interface DraftQuestion {
  question: string;
  user_answer: string;
  topic: string;
  difficulty: string;
}

export default function AddInterview() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    company_name: "",
    role: "",
    interview_type: "Onsite",
    date: "",
    round_name: "",
    result: "",
    confidence: 7,
    notes: "",
    status: "pending",
  });
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));
  const setQ = (idx: number, key: keyof DraftQuestion, value: string) =>
    setQuestions((qs) => {
      const next = [...qs];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  const addQuestion = () =>
    setQuestions((qs) => [...qs, { question: "", user_answer: "", topic: "", difficulty: "Medium" }]);
  const removeQuestion = (idx: number) =>
    setQuestions((qs) => qs.filter((_, i) => i !== idx));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name || !form.role) {
      setError("Company name and role are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const interview = await interviewApi.create({
        company_name: form.company_name,
        role: form.role,
        interview_type: form.interview_type,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        status: form.status,
        confidence: Number(form.confidence),
        notes: form.notes,
        rounds: [
          {
            round_name: form.round_name || "Round 1",
            round_result: form.result,
            questions: questions.filter((q) => q.question.trim()),
          },
        ],
      });
      navigate(`/interviews/${interview.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save interview.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Add New Interview</h1>
        <p className="text-gray-500 text-sm mb-6">Add the details of your interview experience.</p>

        <Card>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label>Company Name</Label>
              <Input
                required
                placeholder="Enter company name"
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                required
                placeholder="Enter role"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Interview Date</Label>
                <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </div>
              <div>
                <Label>Interview Type</Label>
                <select
                  value={form.interview_type}
                  onChange={(e) => set("interview_type", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option>Onsite</option>
                  <option>Remote</option>
                  <option>Telephonic</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Round Name</Label>
                <Input
                  placeholder="e.g. Technical Round 1"
                  value={form.round_name}
                  onChange={(e) => set("round_name", e.target.value)}
                />
              </div>
              <div>
                <Label>Round Result</Label>
                <select
                  value={form.result}
                  onChange={(e) => set("result", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">Select result</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Overall Status</Label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="pending">Pending</option>
                <option value="waiting">Waiting</option>
                <option value="selected">Selected</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <Label>Confidence (1-10): {form.confidence}</Label>
              <input
                type="range"
                min={1}
                max={10}
                value={form.confidence}
                onChange={(e) => set("confidence", Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <Label>Overall Notes</Label>
              <textarea
                rows={3}
                placeholder="Write your overall experience..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200 resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-gray-900">Questions</h2>
                <Button type="button" variant="secondary" className="text-xs px-3 py-1.5" onClick={addQuestion}>
                  <Plus className="w-3.5 h-3.5 mr-1 inline" /> Add Question
                </Button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Add questions and your answers. Use "Check answer with AI" to get the original answer and a correct/wrong verdict.
              </p>

              {questions.length === 0 ? (
                <p className="text-sm text-gray-400">No questions added yet.</p>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Label>Question {idx + 1}</Label>
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          className="text-gray-400 hover:text-red-600"
                          title="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <Input
                        placeholder="Enter the question asked"
                        value={q.question}
                        onChange={(e) => setQ(idx, "question", e.target.value)}
                      />
                      <Label>Your Answer</Label>
                      <textarea
                        rows={2}
                        placeholder="Enter your answer"
                        value={q.user_answer}
                        onChange={(e) => setQ(idx, "user_answer", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200 resize-none"
                      />
                      <AIAnswerCheck question={q.question} answer={q.user_answer} />
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <Label>Topic</Label>
                          <Input
                            placeholder="e.g. Array"
                            value={q.topic}
                            onChange={(e) => setQ(idx, "topic", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Difficulty</Label>
                          <select
                            value={q.difficulty}
                            onChange={(e) => setQ(idx, "difficulty", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
                          >
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate("/interviews")}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Interview"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
