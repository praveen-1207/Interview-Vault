import { useEffect, useState } from "react";
import { Plus, Search, X, Trash2 } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { Card, StatusBadge, Input, Button } from "../components/ui";
import AddInterviewModal from "../components/AddInterviewModal";
import InterviewDetailsModal from "../components/InterviewDetailsModal";
import StatusUpdateModal from "../components/StatusUpdateModal";
import { interviewApi } from "../api/interviews";
import { questionApi } from "../api/misc";
import type { Interview, StatusUpdateItem } from "../types";
import AIAnswerCheck from "../components/AIAnswerCheck";

interface DraftQuestion {
  question: string;
  user_answer: string;
  topic: string;
  difficulty: string;
}

// Default blank question template used when resetting the form.
const emptyQ: DraftQuestion = { question: "", user_answer: "", topic: "", difficulty: "Medium" };

// ---- AddQuestionModal --------------------------------------------------
// Popup that lets you add a question to a (selected) interview row directly
// from the list. Uses questionApi.addToInterview (works even if the interview
// has no rounds yet).
function AddQuestionModal({
  interview,
  onClose,
  onSaved,
}: {
  interview: Interview | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<DraftQuestion>(emptyQ);
  const [saving, setSaving] = useState(false);

  // Whenever the target interview changes, reset the draft to a blank question.
  useEffect(() => setDraft(emptyQ), [interview]);

  if (!interview) return null;

  // Validate + save the new question, then close via onSaved().
  const save = async () => {
    if (!draft.question || saving) return;
    setSaving(true);
    try {
      await questionApi.addToInterview(interview.id, draft);
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
            <h3 className="text-lg font-bold text-gray-900">Add Question</h3>
            <p className="text-sm text-gray-500 mt-0.5">for {interview.company_name}</p>
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
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Your Answer</p>
            <textarea
              rows={3}
              placeholder="Enter your answer"
              value={draft.user_answer}
              onChange={(e) => setDraft({ ...draft, user_answer: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
            />
            <AIAnswerCheck question={draft.question} answer={draft.user_answer} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Topic (e.g. Array)"
              value={draft.topic}
              onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
            />
            <select
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none w-full"
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

// ---- Interviews (main page) --------------------------------------------
// Lists all of the user's interviews in a table with filters (status, search),
// plus per-row actions: view details, add a question, or delete the interview.
// "Add Interview" opens a popup (AddInterviewModal) and clicking a company
// name opens a details popup (InterviewDetailsModal) — both without leaving
// this page.
export default function Interviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Interview | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<Interview | null>(null);
  const [statusUpdateItem, setStatusUpdateItem] = useState<StatusUpdateItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Reload interviews from the server, respecting the current status filter.
  const load = () => {
    setLoading(true);
    interviewApi
      .list(statusFilter ? { status: statusFilter } : undefined)
      .then(setInterviews)
      .finally(() => setLoading(false));
  };

  // Reload whenever the dropdown filter changes.
  useEffect(load, [statusFilter]);

  // Client-side search on company/role so no extra API calls are needed.
  const filtered = interviews.filter(
    (i) =>
      i.company_name.toLowerCase().includes(search.toLowerCase()) ||
      i.role.toLowerCase().includes(search.toLowerCase())
  );

  // Confirm + delete an interview, then refresh the visible list.
  const remove = async (interview: Interview) => {
    if (!window.confirm(`Delete the ${interview.company_name} interview?`)) return;
    await interviewApi.remove(interview.id);
    load();
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all your interview experiences.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Interview
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="">All Statuses</option>
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

      <Card>
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-gray-500 mb-3">No interviews found.</p>
            <button onClick={() => setShowAdd(true)} className="text-brand-600 font-medium text-sm">
              + Add your first interview
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Rounds</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedDetails(i)}>
                  <td className="py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDetails(i);
                      }}
                      className="font-medium text-gray-900 hover:text-brand-600 transition"
                      title="View interview details"
                    >
                      {i.company_name}
                    </button>
                  </td>
                  <td className="py-3 text-gray-600">{i.role}</td>
                  <td className="py-3 text-gray-500">
                    {i.date ? new Date(i.date).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 text-gray-500">{i.rounds.length}</td>
                  <td className="py-3">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusUpdateItem({
                            id: i.id,
                            company_name: i.company_name,
                            role: i.role,
                            status: i.status,
                            days_waiting: i.days_waiting,
                            reminder_type: i.reminder_type,
                            interview_completed_at: i.interview_completed_at,
                          });
                        }}
                      >
                        Update Status
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs px-3 py-1.5"
                        onClick={() => setSelectedCompany(i)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 inline" /> Add Question
                      </Button>
                      <button
                        onClick={() => remove(i)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete interview"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <AddQuestionModal
        interview={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onSaved={() => {
          setSelectedCompany(null);
          load();
        }}
      />

      {showAdd && (
        <AddInterviewModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}

      {selectedDetails && (
        <InterviewDetailsModal interview={selectedDetails} onClose={() => setSelectedDetails(null)} />
      )}

      {statusUpdateItem && (
        <StatusUpdateModal
          item={statusUpdateItem}
          onDone={() => {
            setStatusUpdateItem(null);
            load();
          }}
          onClose={() => setStatusUpdateItem(null)}
        />
      )}
    </AppLayout>
  );
}
