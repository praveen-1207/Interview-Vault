import { useState } from "react";
import { X, BellRing, ArrowRight, Check, ThumbsDown, Loader2 } from "lucide-react";
import { StatusBadge, Button, Input, statusLabel } from "./ui";
import { interviewApi } from "../api/interviews";
import type { StatusUpdateItem } from "../types";

// ---- StatusUpdateModal --------------------------------------------------
// The "what happened?" follow-up popup shown when an interview has been
// waiting too long. The user picks ONE of five actions:
//   1. Moved to next round   -> NEXT_ROUND (new round is created by the backend)
//   2. Got selected          -> SELECTED
//   3. Rejected              -> REJECTED
//   4. Still waiting         -> stays AWAITING_RESULT, clock resets (+3 days)
//   5. Tell me later         -> snooze (+3 days)
// After any action `onDone` fires so the parent can advance to the next item.
export default function StatusUpdateModal({
  item,
  onDone,
  onClose,
}: {
  item: StatusUpdateItem;
  onDone: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showNextRound, setShowNextRound] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [error, setError] = useState("");

  const isNoResponse = item.reminder_type === "NO_RESPONSE";
  const days = item.days_waiting;

  // Run an action against the backend, then let the parent advance.
  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BellRing className="w-4 h-4 text-brand-600" />
              <h3 className="text-lg font-bold text-gray-900">What happened?</h3>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {item.company_name} · {item.role}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <StatusBadge status={item.status} />
          <span className="text-xs text-gray-400">
            Waiting for {days} {days === 1 ? "day" : "days"} since the interview
          </span>
        </div>

        {isNoResponse && (
          <div className="mb-4 rounded-xl bg-orange-50 border border-orange-100 p-3 text-sm text-orange-800">
            It's been over 30 days with no response from{" "}
            <span className="font-semibold">{item.company_name}</span>. Update the
            status or keep waiting — this isn't marked as a rejection.
          </div>
        )}

        {/* The five actions */}
        <div className="space-y-2">
          {!showNextRound ? (
            <Button
              variant="secondary"
              className="w-full justify-between !text-left"
              disabled={busy}
              onClick={() => setShowNextRound(true)}
            >
              <span className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" /> Moved to next round
              </span>
              <span className="text-xs text-gray-400">New round created</span>
            </Button>
          ) : (
            <div className="rounded-xl border border-gray-200 p-3 space-y-2">
              <Input
                placeholder="Round name, e.g. Technical Round 2"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1 justify-center"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      interviewApi.updateStatus(item.id, {
                        status: "NEXT_ROUND",
                        next_round: roundName || undefined,
                      }),
                    )
                  }
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save round"}
                </Button>
                <Button variant="secondary" onClick={() => setShowNextRound(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <Button
            variant="secondary"
            className="w-full justify-between"
            disabled={busy}
            onClick={() => run(() => interviewApi.updateStatus(item.id, { status: "SELECTED" }))}
          >
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" /> I got selected
            </span>
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-between"
            disabled={busy}
            onClick={() => run(() => interviewApi.updateStatus(item.id, { status: "REJECTED" }))}
          >
            <span className="flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-500" /> I was rejected
            </span>
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-between"
            disabled={busy}
            onClick={() =>
              run(() => interviewApi.updateStatus(item.id, { status: "AWAITING_RESULT" }))
            }
          >
            <span className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-600" /> Still waiting — remind me in 3 days
            </span>
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-between"
            disabled={busy}
            onClick={() => run(() => interviewApi.snoozeStatusReminder(item.id))}
          >
            <span className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-gray-500" /> Tell me later
            </span>
            <span className="text-xs text-gray-400">+3 days</span>
          </Button>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex justify-end pt-4 mt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400 mr-auto pt-2">
            Current status: {statusLabel(item.status)}
          </span>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
