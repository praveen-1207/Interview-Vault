import { useState } from "react";
import { Plus, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Input, Label, Button } from "./ui";
import AIAnswerCheck from "./AIAnswerCheck";

export interface DraftQuestion {
  question: string;
  user_answer: string;
  topic: string;
  difficulty: string;
}

// Default blank question template used when adding a new question.
const emptyQ: DraftQuestion = { question: "", user_answer: "", topic: "", difficulty: "Medium" };

// ---- QuestionModal -----------------------------------------------------
// Popup used to add/edit questions. Instead of stacking questions down the
// page, this modal shows ONE question at a time. At the top of the box there
// are "Previous" and "New Question" controls so you can page back through
// earlier questions or start another one — all inside the same popup.
export default function QuestionModal({
  initial,
  onClose,
  onSave,
}: {
  initial: DraftQuestion[];
  onClose: () => void;
  onSave: (questions: DraftQuestion[]) => void;
}) {
  const [drafts, setDrafts] = useState<DraftQuestion[]>(
    initial.length ? initial.map((q) => ({ ...q })) : [{ ...emptyQ }]
  );
  const [current, setCurrent] = useState(0);

  const draft = drafts[current];

  // Update a single field of the question currently shown on screen.
  const setField = (key: keyof DraftQuestion, value: string) =>
    setDrafts((prev) => {
      const next = [...prev];
      next[current] = { ...next[current], [key]: value };
      return next;
    });

  // Append a brand-new blank question and jump straight to its page.
  const addNew = () => {
    setDrafts((prev) => [...prev, { ...emptyQ }]);
    setCurrent(drafts.length);
  };

  // Remove the question currently being viewed (keeps at least one page).
  const removeCurrent = () => {
    if (drafts.length === 1) return;
    const next = drafts.filter((_, i) => i !== current);
    setDrafts(next);
    setCurrent(Math.max(0, current - 1));
  };

  // Commit only the questions that actually have text, then close the popup.
  const save = () => {
    onSave(drafts.filter((q) => q.question.trim()));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Top bar: previous page + new question controls */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <Button
            type="button"
            variant="secondary"
            className="text-xs px-2.5 py-1.5"
            disabled={current === 0}
            onClick={() => setCurrent(current - 1)}
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1 inline" /> Previous
          </Button>

          {/* Page dots — click a dot to jump to that question */}
          <div className="flex items-center gap-1.5">
            {drafts.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-6 bg-brand-600" : "w-2 bg-gray-300 hover:bg-gray-400"
                }`}
                title={`Question ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            {drafts.length > 1 && (
              <button
                onClick={removeCurrent}
                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                title="Remove this question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <Button type="button" variant="secondary" className="text-xs px-2.5 py-1.5" onClick={addNew}>
              <Plus className="w-3.5 h-3.5 mr-1 inline" /> New Question
            </Button>
          </div>
        </div>

        {/* Header + close */}
        <div className="flex items-start justify-between px-5 pt-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Question {current + 1} of {drafts.length}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Fill in the question and your answer.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question form body (scrolls only if the box is too small) */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <Input
            placeholder="Enter the question asked"
            value={draft.question}
            onChange={(e) => setField("question", e.target.value)}
          />
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Your Answer</p>
            <textarea
              rows={3}
              placeholder="Enter your answer"
              value={draft.user_answer}
              onChange={(e) => setField("user_answer", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200 resize-none"
            />
            <AIAnswerCheck question={draft.question} answer={draft.user_answer} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Topic</Label>
              <Input
                placeholder="e.g. Array"
                value={draft.topic}
                onChange={(e) => setField("topic", e.target.value)}
              />
            </div>
            <div>
              <Label>Difficulty</Label>
              <select
                value={draft.difficulty}
                onChange={(e) => setField("difficulty", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="text-xs px-2.5 py-1.5"
              disabled={current === drafts.length - 1}
              onClick={() => setCurrent(current + 1)}
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1 inline" />
            </Button>
            <Button type="button" onClick={save}>
              Save Questions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
