import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Sparkles, Plus, Loader2, Pencil, Trash2, X, Target } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { Card, StatusBadge, Button, Input, Label, statusLabel } from "../components/ui";
import { interviewApi } from "../api/interviews";
import { questionApi, aiApi } from "../api/misc";
import type { Interview, Question, AIConfidence, InterviewStatus } from "../types";
import AIAnswerCheck from "../components/AIAnswerCheck";

const statuses: InterviewStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "AWAITING_RESULT",
  "NEXT_ROUND",
  "SELECTED",
  "REJECTED",
  "NO_RESPONSE",
];

// ---- EditInterviewModal -----------------------------------------------
// Modal form that edits an existing interview. Pre-fills its fields from the
// current interview, and on save calls interviewApi.update (partial update)
// then notifies the parent to reload the interview data.
function EditInterviewModal({
  interview,
  onClose,
  onSaved,
}: {
  interview: Interview | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState({
    company_name: "",
    role: "",
    interview_type: "",
    date: "",
    status: "AWAITING_RESULT" as InterviewStatus,
    confidence: 5,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // When the modal opens, copy the interview's current values into the
  // local draft state so the user sees the existing data they'll edit.
  useEffect(() => {
    if (!interview) return;
    setDraft({
      company_name: interview.company_name,
      role: interview.role,
      interview_type: interview.interview_type || "",
      date: interview.date ? interview.date.slice(0, 10) : "",
      status: interview.status,
      confidence: interview.confidence,
      notes: interview.notes || "",
    });
  }, [interview]);

  if (!interview) return null;

  // Send the edited fields to the backend. The date is normalised to
  // YYYY-MM-DD before sending so the datetime accepts it cleanly.
  const save = async () => {
    if (!draft.company_name || !draft.role || saving) return;
    setSaving(true);
    try {
      await interviewApi.update(interview.id, {
        company_name: draft.company_name,
        role: draft.role,
        interview_type: draft.interview_type || undefined,
        date: draft.date ? new Date(draft.date).toISOString().slice(0, 10) : undefined,
        status: draft.status,
        confidence: draft.confidence,
        notes: draft.notes || undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit Interview</h3>
            <p className="text-sm text-gray-500 mt-0.5">Update the details of this interview.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Company</Label>
              <Input
                value={draft.company_name}
                onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Interview Type</Label>
              <Input
                placeholder="e.g. Technical"
                value={draft.interview_type}
                onChange={(e) => setDraft({ ...draft, interview_type: e.target.value })}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as InterviewStatus })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Confidence</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={draft.confidence}
                onChange={(e) => setDraft({ ...draft, confidence: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-brand-200"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!draft.company_name || !draft.role || saving} onClick={save}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- AddRoundModal -----------------------------------------------------
// Modal that adds a brand-new round to an interview (e.g. "Technical Round 2").
// Sends round_name and round_result as query params and refreshes on save.
function AddRoundModal({
  interview,
  onClose,
  onSaved,
}: {
  interview: Interview | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [roundName, setRoundName] = useState("");
  const [roundResult, setRoundResult] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-suggest the next round number based on how many exist already.
  useEffect(() => {
    setRoundName(`Round ${(interview?.rounds.length || 0) + 1}`);
    setRoundResult("");
  }, [interview]);

  if (!interview) return null;

  const save = async () => {
    if (!roundName || saving) return;
    setSaving(true);
    try {
      await interviewApi.addRound(interview.id, {
        round_name: roundName,
        round_result: roundResult || undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Add Round</h3>
            <p className="text-sm text-gray-500 mt-0.5">for {interview.company_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Round Name</Label>
            <Input value={roundName} onChange={(e) => setRoundName(e.target.value)} />
          </div>
          <div>
            <Label>Result (optional)</Label>
            <Input
              placeholder="e.g. Cleared, Asked to come back..."
              value={roundResult}
              onChange={(e) => setRoundResult(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!roundName || saving} onClick={save}>
            {saving ? "Saving..." : "Add Round"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- EditQuestionModal ------------------------------------------------
// Modal that edits one stored question (text, answer, topic, difficulty).
// Uses questionApi.update then lets the parent reload the interview.
function EditQuestionModal({
  question,
  onClose,
  onSaved,
}: {
  question: Question | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState({ question: "", user_answer: "", topic: "", difficulty: "Medium" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!question) return;
    setDraft({
      question: question.question,
      user_answer: question.user_answer || "",
      topic: question.topic || "",
      difficulty: question.difficulty || "Medium",
    });
  }, [question]);

  if (!question) return null;

  const save = async () => {
    if (!draft.question || saving) return;
    setSaving(true);
    try {
      await questionApi.update(question.id, {
        question: draft.question,
        user_answer: draft.user_answer || undefined,
        topic: draft.topic || undefined,
        difficulty: draft.difficulty || undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit Question</h3>
            <p className="text-sm text-gray-500 mt-0.5">Update the question and your answer.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="Question"
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
          />
          <textarea
            placeholder="Your answer"
            rows={3}
            value={draft.user_answer}
            onChange={(e) => setDraft({ ...draft, user_answer: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
          />
          <AIAnswerCheck question={draft.question} answer={draft.user_answer} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Topic (e.g. Array)"
              value={draft.topic}
              onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
            />
            <select
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none w-full"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!draft.question || saving} onClick={save}>
            {saving ? "Saving..." : "Save Question"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- InterviewDetail (main page) ---------------------------------------
// Shows a single interview: header info, a Questions/Notes toggle, the list
// of rounds + their questions (with AI feedback), and buttons to edit the
// interview, add a round, add/edit/delete questions, or delete the interview.
export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"questions" | "notes">("questions");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [showAddQuestion, setShowAddQuestion] = useState<string | null>(null);
  const [showTopAdd, setShowTopAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddRound, setShowAddRound] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [newQ, setNewQ] = useState({ question: "", user_answer: "", topic: "", difficulty: "Medium" });
  const [checkingConfidence, setCheckingConfidence] = useState<string | null>(null);
  const [confidenceResults, setConfidenceResults] = useState<Record<string, AIConfidence>>({});

  // Fetch the interview by the URL id whenever it changes, showing a
  // loading state until the request finishes.
  const load = () => {
    if (!id) return;
    setLoading(true);
    interviewApi.get(id).then(setInterview).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  // Generate + persist AI feedback for a question, then refresh the page so
  // the saved AI answer appears immediately.
  const generateAI = async (questionId: string) => {
    setGeneratingId(questionId);
    try {
      await aiApi.generateAndSave(questionId);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "AI generation failed.");
    } finally {
      setGeneratingId(null);
    }
  };

  // Ask Gemini to score how confidently the candidate answered a question.
  // The backend compares the stored question + user answer against the saved
  // ai_correct_answer, and the AI model decides the confidence level itself.
  const checkConfidence = async (questionId: string) => {
    setCheckingConfidence(questionId);
    try {
      const result = await aiApi.generateConfidence(questionId);
      setConfidenceResults((prev) => ({ ...prev, [questionId]: result }));
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Confidence check failed. Generate the AI answer first.");
    } finally {
      setCheckingConfidence(null);
    }
  };

  // Save a question into a specific round via the round-level endpoint.
  const addQuestion = async (roundId: string) => {
    if (!newQ.question) return;
    await questionApi.addToRound(roundId, newQ);
    setNewQ({ question: "", user_answer: "", topic: "", difficulty: "Medium" });
    setShowAddQuestion(null);
    load();
  };

  // Save a question at the interview level (backend auto-creates a default
  // "Round 1" if the interview has no rounds yet).
  const addTopQuestion = async () => {
    if (!id || !newQ.question) return;
    await questionApi.addToInterview(id, newQ);
    setNewQ({ question: "", user_answer: "", topic: "", difficulty: "Medium" });
    setShowTopAdd(false);
    load();
  };

  // Ask for confirmation then permanently remove a question.
  const deleteQuestion = async (question: Question) => {
    if (!window.confirm("Delete this question?")) return;
    await questionApi.remove(question.id);
    load();
  };

  // Ask for confirmation then delete the whole interview and leave the page.
  const deleteInterview = async () => {
    if (!id || !window.confirm("Delete this interview permanently?")) return;
    await interviewApi.remove(id);
    navigate("/interviews");
  };

  if (loading) {
    return (
      <AppLayout>
        <p className="text-sm text-gray-400">Loading...</p>
      </AppLayout>
    );
  }

  if (!interview) {
    return (
      <AppLayout>
        <p className="text-sm text-gray-500">Interview not found.</p>
      </AppLayout>
    );
  }

  // Count every question across all rounds for the tab label.
  const totalQuestions = interview.rounds.reduce((sum, r) => sum + r.questions.length, 0);

  return (
    <AppLayout>
      <div className="text-xs text-gray-400 mb-2">
        <Link to="/interviews" className="hover:text-gray-600">Interviews</Link> /{" "}
        <span className="text-gray-600">{interview.company_name} · {interview.role}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center font-bold text-brand-600">
            {interview.company_name[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {interview.company_name} · {interview.role}
            </h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span>{interview.date ? new Date(interview.date).toLocaleDateString() : "No date set"}</span>
              <span>·</span>
              <span>{interview.rounds.length} round(s)</span>
              <span>·</span>
              <span>Confidence {interview.confidence}/10</span>
              {interview.interview_type && (
                <>
                  <span>·</span>
                  <span>{interview.interview_type}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={interview.status} />
          <div className="flex gap-2">
            <Button variant="secondary" className="text-xs px-3 py-1.5" onClick={() => setShowEdit(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1 inline" /> Edit
            </Button>
            <Button
              variant="secondary"
              className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50"
              onClick={deleteInterview}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1 inline" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-gray-100">
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === "questions" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500"
          }`}
        >
          Questions ({totalQuestions})
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === "notes" ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500"
          }`}
        >
          Notes
        </button>
      </div>

      {activeTab === "notes" ? (
        <Card>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {interview.notes || "No notes added for this interview yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Questions</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Add a question and answer for {interview.company_name}. Questions go to a "Round 1" by default.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowAddRound(true)}>
                <Plus className="w-4 h-4 mr-1.5 inline" /> Add Round
              </Button>
              <Button onClick={() => { setShowTopAdd(!showTopAdd); setActiveTab("questions"); }}>
                <Plus className="w-4 h-4 mr-1.5 inline" /> Add Question
              </Button>
            </div>
          </Card>

          {showTopAdd && (
            <Card className="bg-gray-50">
              <div className="space-y-3">
                <Input
                  placeholder="Question"
                  value={newQ.question}
                  onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
                />
                <textarea
                  placeholder="Your answer"
                  rows={2}
                  value={newQ.user_answer}
                  onChange={(e) => setNewQ({ ...newQ, user_answer: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none"
                />
                <AIAnswerCheck question={newQ.question} answer={newQ.user_answer} />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Topic (e.g. Array)"
                    value={newQ.topic}
                    onChange={(e) => setNewQ({ ...newQ, topic: e.target.value })}
                  />
                  <select
                    value={newQ.difficulty}
                    onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onClick={() => setShowTopAdd(false)}>Cancel</Button>
                  <Button type="button" onClick={addTopQuestion} disabled={!newQ.question}>Save Question</Button>
                </div>
              </div>
            </Card>
          )}

          {interview.rounds.length === 0 && !showTopAdd && (
            <Card>
              <p className="text-sm text-gray-500">No rounds added yet.</p>
            </Card>
          )}
          {interview.rounds.map((round) => (
            <Card key={round.id}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {round.round_name}
                  {round.round_result && (
                    <span className="ml-2 text-xs font-medium text-emerald-600">{round.round_result}</span>
                  )}
                </h3>
                <button
                  onClick={() => setShowAddQuestion(showAddQuestion === round.id ? null : round.id)}
                  className="text-sm text-brand-600 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Question
                </button>
              </div>

              {showAddQuestion === round.id && (
                <div className="mb-5 p-4 rounded-xl bg-gray-50 space-y-3">
                  <Input
                    placeholder="Question"
                    value={newQ.question}
                    onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
                  />
                  <textarea
                    placeholder="Your answer"
                    rows={2}
                    value={newQ.user_answer}
                    onChange={(e) => setNewQ({ ...newQ, user_answer: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  />
                  <AIAnswerCheck question={newQ.question} answer={newQ.user_answer} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Topic (e.g. Array)"
                      value={newQ.topic}
                      onChange={(e) => setNewQ({ ...newQ, topic: e.target.value })}
                    />
                    <select
                      value={newQ.difficulty}
                      onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value })}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </div>
                  <Button onClick={() => addQuestion(round.id)} className="w-full justify-center">
                    Save Question
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {round.questions.map((q, idx) => (
                  <div key={q.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm">
                          {idx + 1}. {q.question}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {q.topic && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{q.topic}</span>
                        )}
                        {q.difficulty && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{q.difficulty}</span>
                        )}
                        <button
                          onClick={() => setEditingQuestion(q)}
                          className="p-1 rounded text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition"
                          title="Edit question"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteQuestion(q)}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Your Answer</p>
                        <p className="text-sm text-gray-700">{q.user_answer || "—"}</p>
                      </div>
                      <div className="bg-brand-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-brand-700 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Ideal Answer
                          </p>
                          {!q.ai_correct_answer && (
                            <button
                              onClick={() => generateAI(q.id)}
                              disabled={generatingId === q.id}
                              className="text-[11px] font-medium text-brand-700 flex items-center gap-1 hover:underline disabled:opacity-50"
                            >
                              {generatingId === q.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                                </>
                              ) : (
                                "Generate"
                              )}
                            </button>
                          )}
                        </div>
                        {q.ai_correct_answer ? (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">{q.ai_correct_answer}</p>
                            {q.ai_missing_points && (
                              <p className="text-xs text-gray-500">
                                <span className="font-semibold">Missing points: </span>
                                {q.ai_missing_points}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Not generated yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      {q.ai_correct_answer ? (
                        <button
                          onClick={() => checkConfidence(q.id)}
                          disabled={checkingConfidence === q.id}
                          className="text-[11px] font-medium text-brand-700 flex items-center gap-1 hover:underline disabled:opacity-50"
                        >
                          {checkingConfidence === q.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" /> Checking confidence...
                            </>
                          ) : (
                            <>
                              <Target className="w-3 h-3" /> Check Confidence
                            </>
                          )}
                        </button>
                      ) : (
                        <p className="text-[11px] text-gray-400">
                          Generate the AI answer first to check confidence.
                        </p>
                      )}

                      {confidenceResults[q.id] && (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                                confidenceResults[q.id].confidence_score >= 7
                                  ? "bg-emerald-50 text-emerald-600"
                                  : confidenceResults[q.id].confidence_score >= 5
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {confidenceResults[q.id].confidence_score}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                Confidence: {confidenceResults[q.id].confidence_level}
                              </p>
                              <p className="text-xs text-gray-400">Score out of 10 · decided by AI</p>
                            </div>
                          </div>

                          <p className="text-gray-600">{confidenceResults[q.id].reason}</p>

                          {confidenceResults[q.id].strengths.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-emerald-600 mb-1">Strengths</p>
                              <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                                {confidenceResults[q.id].strengths.map((s, i) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {confidenceResults[q.id].weaknesses.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-red-600 mb-1">Weaknesses</p>
                              <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                                {confidenceResults[q.id].weaknesses.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {confidenceResults[q.id].improvement && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs font-semibold text-gray-500 mb-1">Improvement</p>
                              <p className="text-gray-700">{confidenceResults[q.id].improvement}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {round.questions.length === 0 && (
                  <p className="text-sm text-gray-400">No questions added for this round yet.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showEdit && (
        <EditInterviewModal
          interview={interview}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}
      {showAddRound && (
        <AddRoundModal
          interview={interview}
          onClose={() => setShowAddRound(false)}
          onSaved={() => {
            setShowAddRound(false);
            load();
          }}
        />
      )}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => {
            setEditingQuestion(null);
            load();
          }}
        />
      )}
    </AppLayout>
  );
}