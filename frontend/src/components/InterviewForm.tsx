import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input, Label, Button } from "./ui";
import { interviewApi } from "../api/interviews";
import type { Interview } from "../types";
import QuestionModal, { type DraftQuestion } from "./QuestionModal";

// ---- InterviewForm -----------------------------------------------------
// The full "create interview" form: company/role/date/type/status/confidence/
// notes plus a Questions section that opens the QuestionModal popup.
//
// This component is intentionally presentational about its container: the
// AddInterview *page* and the AddInterview *popup* both render the same form
// here. `onCancel` and `onCreated` are provided by the caller so the same
// form behaves correctly in either place.
export default function InterviewForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (interview: Interview) => void;
}) {
  // The top-level interview form values.
  const [form, setForm] = useState({
    company_name: "",
    role: "",
    interview_type: "Onsite",
    date: "",
    round_name: "",
    result: "",
    confidence: 7,
    notes: "",
    status: "AWAITING_RESULT",
  });
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Small helper: update a single top-level form field.
  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  // Reopen the popup with the already-added questions so the user can edit
  // them (via Previous/New controls) or add more.
  const openModal = () => {
    setShowModal(true);
  };

  // Remove a question straight from the summary list.
  const removeQuestion = (idx: number) =>
    setQuestions((qs) => qs.filter((_, i) => i !== idx));

  // Validate required fields, then build the payload (one round containing all
  // non-empty questions) and POST it. On success we hand the new interview to
  // the caller via `onCreated`.
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
      onCreated(interview);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save interview.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
            <option value="APPLIED">Applied</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="INTERVIEW_COMPLETED">Interview Completed</option>
            <option value="AWAITING_RESULT">Awaiting Result</option>
            <option value="NEXT_ROUND">Next Round</option>
            <option value="SELECTED">Selected</option>
            <option value="REJECTED">Rejected</option>
            <option value="NO_RESPONSE">No Response</option>
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
            <Button type="button" variant="secondary" className="text-xs px-3 py-1.5" onClick={openModal}>
              <Plus className="w-3.5 h-3.5 mr-1 inline" /> Add Questions
            </Button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Questions are added in a popup — one at a time, with Previous / New Question controls.
          </p>

          {questions.length === 0 ? (
            <p className="text-sm text-gray-400">No questions added yet.</p>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{q.question}</p>
                    <p className="text-xs text-gray-400">
                      {q.topic || "No topic"} · {q.difficulty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowModal(true)}
                      className="text-xs text-brand-600 font-medium hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="text-gray-400 hover:text-red-600"
                      title="Remove question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Interview"}
          </Button>
        </div>
      </form>

      {showModal && (
        <QuestionModal
          initial={questions}
          onClose={() => setShowModal(false)}
          onSave={(saved) => setQuestions(saved)}
        />
      )}
    </>
  );
}
