import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge, Button } from "./ui";
import type { Interview } from "../types";

// ---- InterviewDetailsModal ---------------------------------------------
// Popup that shows the basic details of an interview when the user clicks its
// company name in the Interviews list. Displays the headline info (role, date,
// type, status, confidence, rounds/questions counts, notes). A button links to
// the full detail page for deeper management.
export default function InterviewDetailsModal({
  interview,
  onClose,
}: {
  interview: Interview;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const totalQuestions = interview.rounds.reduce((sum, r) => sum + r.questions.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Header + close */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center font-bold text-brand-600">
              {interview.company_name[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{interview.company_name}</h3>
              <p className="text-sm text-gray-500">{interview.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <StatusBadge status={interview.status} />
        </div>

        {/* Basic details grid */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Interview Type</span>
            <span className="text-gray-900 font-medium">{interview.interview_type || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Date</span>
            <span className="text-gray-900 font-medium">
              {interview.date ? new Date(interview.date).toLocaleDateString() : "—"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Confidence</span>
            <span className="text-gray-900 font-medium">{interview.confidence}/10</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Rounds</span>
            <span className="text-gray-900 font-medium">{interview.rounds.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Questions</span>
            <span className="text-gray-900 font-medium">{totalQuestions}</span>
          </div>

          {interview.notes && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{interview.notes}</p>
            </div>
          )}
        </div>

        {/* Footer: open the full page or close */}
        <div className="flex justify-end gap-2 pt-5 border-t border-gray-100 mt-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/interviews/${interview.id}`);
            }}
          >
            View Full Details
          </Button>
        </div>
      </div>
    </div>
  );
}
