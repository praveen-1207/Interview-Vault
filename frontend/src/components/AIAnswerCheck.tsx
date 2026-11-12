// AIAnswerCheck — inline "Check answer with AI" control.
// Embed it in any form (Add Interview, Interview Detail, Edit Question) with
// the current question + typed answer. It calls the stateless AI endpoint and
// shows a correct / wrong verdict plus the AI's ideal answer right there.
import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { aiApi } from "../api/misc";

interface Props {
  question: string;
  answer: string;
}

export default function AIAnswerCheck({ question, answer }: Props) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    correct_answer: string;
    is_correct: boolean;
    verdict: string;
  } | null>(null);
  const [error, setError] = useState("");

  // Only enable the button once both question and answer have some text.
  const canCheck = question.trim().length > 0 && answer.trim().length > 0;

  // Call the stateless AI endpoint and store the verdict to display it.
  const check = async () => {
    if (!canCheck || checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await aiApi.generate(question, answer);
      setResult({
        correct_answer: res.correct_answer,
        is_correct: res.is_correct,
        verdict: res.verdict,
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "AI check failed.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={check}
        disabled={!canCheck || checking}
        className="text-xs font-medium text-brand-700 flex items-center gap-1 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {checking ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" /> Checking answer...
          </>
        ) : result ? (
          <>
            <Sparkles className="w-3 h-3" /> Re-check answer
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" /> Check answer with AI
          </>
        )}
      </button>

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}

      {result && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 text-sm">
          <div
            className={`flex items-center gap-1.5 font-semibold ${
              result.is_correct ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {result.is_correct ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {result.verdict}
          </div>
          {result.correct_answer && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-gray-500 mb-1">Original Answer</p>
              <p className="text-gray-700 whitespace-pre-wrap">{result.correct_answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
