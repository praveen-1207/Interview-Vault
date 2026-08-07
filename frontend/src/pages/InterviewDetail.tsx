import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { Card, StatusBadge, Button, Input } from "../components/ui";
import { interviewApi } from "../api/interviews";
import { questionApi, aiApi } from "../api/misc";
import type { Interview } from "../types";
import AIAnswerCheck from "../components/AIAnswerCheck";

export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"questions" | "notes">("questions");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [showAddQuestion, setShowAddQuestion] = useState<string | null>(null);
  const [showTopAdd, setShowTopAdd] = useState(false);
  const [newQ, setNewQ] = useState({ question: "", user_answer: "", topic: "", difficulty: "Medium" });

  const load = () => {
    if (!id) return;
    setLoading(true);
    interviewApi.get(id).then(setInterview).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

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

  const addQuestion = async (roundId: string) => {
    if (!newQ.question) return;
    await questionApi.addToRound(roundId, newQ);
    setNewQ({ question: "", user_answer: "", topic: "", difficulty: "Medium" });
    setShowAddQuestion(null);
    load();
  };

  const addTopQuestion = async () => {
    if (!id || !newQ.question) return;
    await questionApi.addToInterview(id, newQ);
    setNewQ({ question: "", user_answer: "", topic: "", difficulty: "Medium" });
    setShowTopAdd(false);
    load();
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
            </div>
          </div>
        </div>
        <StatusBadge status={interview.status} />
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
            <Button onClick={() => { setShowTopAdd(!showTopAdd); setActiveTab("questions"); }}>
              <Plus className="w-4 h-4 mr-1.5 inline" /> Add Question
            </Button>
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
                      <p className="font-medium text-gray-900 text-sm">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {q.topic && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{q.topic}</span>
                        )}
                        {q.difficulty && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{q.difficulty}</span>
                        )}
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
    </AppLayout>
  );
}
