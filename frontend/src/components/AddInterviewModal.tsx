import { X } from "lucide-react";
import InterviewForm from "./InterviewForm";
import type { Interview } from "../types";

// ---- AddInterviewModal -------------------------------------------------
// Popup version of the "Add New Interview" form. The full form (InterviewForm)
// is rendered inside a centered dialog so the user never leaves the Interviews
// page. On success it calls `onCreated` so the caller can close the popup and
// refresh the list.
export default function AddInterviewModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (interview: Interview) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header + close */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Add New Interview</h3>
            <p className="text-sm text-gray-500 mt-0.5">Add the details of your interview experience.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body (popup never overflows the screen) */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <InterviewForm
            onCancel={onClose}
            onCreated={(interview) => {
              onCreated(interview);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
