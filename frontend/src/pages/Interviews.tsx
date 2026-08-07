import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, X } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { Card, StatusBadge, Input, Button } from "../components/ui";
import { interviewApi } from "../api/interviews";
import { questionApi } from "../api/misc";
import type { Interview } from "../types";
import AIAnswerCheck from "../components/AIAnswerCheck";

interface DraftQuestion {
  question: string;
  user_answer: string;
  topic: string;
  difficulty: string;
}

const emptyQ: DraftQuestion = { question: "", user_answer: "", topic: "", difficulty: "Medium" };

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

  useEffect(() => setDraft(emptyQ), [interview]);

  if (!interview) return null;

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

export default function Interviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Interview | null>(null);

  const load = () => {
    setLoading(true);
    interviewApi
      .list(statusFilter ? { status: statusFilter } : undefined)
      .then(setInterviews)
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const filtered = interviews.filter(
    (i) =>
      i.company_name.toLowerCase().includes(search.toLowerCase()) ||
      i.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all your interview experiences.</p>
        </div>
        <Link
          to="/interviews/new"
          className="bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Interview
        </Link>
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
          <option value="selected">Selected</option>
          <option value="waiting">Waiting</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-gray-500 mb-3">No interviews found.</p>
            <Link to="/interviews/new" className="text-brand-600 font-medium text-sm">
              + Add your first interview
            </Link>
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
                <tr key={i.id} className="hover:bg-gray-50 transition cursor-pointer">
                  <td className="py-3">
                    <Link to={`/interviews/${i.id}`} className="font-medium text-gray-900">
                      {i.company_name}
                    </Link>
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
                    <Button
                      variant="secondary"
                      className="text-xs px-3 py-1.5"
                      onClick={() => setSelectedCompany(i)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 inline" /> Add Question
                    </Button>
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
    </AppLayout>
  );
}
