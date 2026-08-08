// NotificationsDropdown — the bell icon in the top bar.
// Shows the interviews that are waiting for a status update (the reminder
// flow) in a slide-down panel. A red badge on the bell shows how many need
// attention. Clicking a notification opens the StatusUpdateModal for that
// interview; after an action the list refreshes automatically.
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ChevronRight, Clock } from "lucide-react";
import { interviewApi } from "../../api/interviews";
import type { StatusUpdateItem } from "../../types";
import { StatusBadge } from "../ui";
import StatusUpdateModal from "../StatusUpdateModal";

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StatusUpdateItem[]>([]);
  const [count, setCount] = useState(0);
  const [current, setCurrent] = useState<StatusUpdateItem | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Pull the current list of interviews that need attention. The backend
  // decides what is due (never the browser clock), so this call is the single
  // source of truth for both the badge count and the panel contents.
  const refresh = async () => {
    try {
      const res = await interviewApi.statusUpdates();
      setCount(res.count);
      setItems(res.interviews);
    } catch {
      // Non-critical: ignore fetch errors.
    }
  };

  // Load once for the badge, and again whenever the panel opens.
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  // Close the panel when clicking anywhere outside it.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // After a status action, close the modal and re-fetch so the badge and the
  // list reflect the new state immediately (no stale notifications).
  const handleDone = async () => {
    setCurrent(null);
    await refresh();
  };

  return (
    <div className="relative" ref={rootRef}>
      {/* The bell button. A red badge shows how many interviews are waiting
          (capped at "9+" so the button stays compact). */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-gray-500" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-2xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden z-20 animate-dropdown-slide">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-400">
                {count === 1 ? "1 interview waiting" : `${count} interviews waiting`}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-medium"
            >
              Close
            </button>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto">
            {items.length === 0 ? (
              // Empty state: nothing waiting for an update.
              <div className="px-4 py-10 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">You're all caught up</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  No interviews are waiting for a status update.
                </p>
              </div>
            ) : (
              // One row per interview. Tapping it opens the status modal for
              // that interview (see the StatusUpdateModal at the bottom).
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrent(item);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition flex items-center gap-3"
                >
                  {/* Icon: orange clock for No Response, amber otherwise. */}
                  <div
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                      item.reminder_type === "NO_RESPONSE"
                        ? "bg-orange-50"
                        : "bg-amber-50"
                    }`}
                  >
                    <Clock
                      className={`w-4 h-4 ${
                        item.reminder_type === "NO_RESPONSE"
                          ? "text-orange-600"
                          : "text-amber-600"
                      }`}
                    />
                  </div>
                  {/* Company, role, how long we've been waiting, status badge. */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.company_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.role} · waiting {item.days_waiting}{" "}
                      {item.days_waiting === 1 ? "day" : "days"}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400">
              Open one to update its status
            </span>
          </div>
        </div>
      )}

      {/* The "What happened?" modal for whichever notification was tapped. */}
      {current && (
        <StatusUpdateModal
          item={current}
          onDone={handleDone}
          onClose={() => setCurrent(null)}
        />
      )}
    </div>
  );
}
