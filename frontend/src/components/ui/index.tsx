// =========================================================
// Reusable UI building blocks (Card, StatusBadge, Button, Input, Label).
// These keep the app's look consistent with Tailwind classes while hiding
// the repeated markup, so pages just say <Card> / <Button> / <Input>.
// =========================================================
import type { ReactNode } from "react";

// Card — a rounded white container with a soft border used as a content box.
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-card p-5 ${className}`}>
      {children}
    </div>
  );
}

// Map each interview status to matching text colors (used by StatusBadge).
const statusStyles: Record<string, string> = {
  APPLIED: "bg-gray-100 text-gray-600",
  SHORTLISTED: "bg-sky-50 text-sky-700",
  INTERVIEW_SCHEDULED: "bg-indigo-50 text-indigo-700",
  INTERVIEW_COMPLETED: "bg-blue-50 text-blue-700",
  AWAITING_RESULT: "bg-amber-50 text-amber-700",
  SELECTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  NEXT_ROUND: "bg-violet-50 text-violet-700",
  NO_RESPONSE: "bg-orange-50 text-orange-700",
  // Legacy lowercase values still render correctly.
  pending: "bg-gray-100 text-gray-600",
  waiting: "bg-amber-50 text-amber-700",
};

// Human-readable label for each status (also used in filters/selects).
const statusLabels: Record<string, string> = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETED: "Interview Completed",
  AWAITING_RESULT: "Awaiting Result",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  NEXT_ROUND: "Next Round",
  NO_RESPONSE: "No Response",
  pending: "Pending",
  waiting: "Waiting",
};

// statusLabel — pretty-print any status value for display in pills/selects.
export function statusLabel(status: string): string {
  return statusLabels[status] || status;
}

// StatusBadge — a small pill showing an interview status with its color.
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
        statusStyles[status] || statusStyles.pending
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

// Button — the standard button with three visual variants:
// primary (brand filled), secondary (gray), ghost (borderless).
export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    ghost: "text-gray-600 hover:bg-gray-50",
  };
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// Input — a styled text/number/date input box.
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition ${props.className || ""}`}
    />
  );
}

// Label — small bold caption placed above a form field.
export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1.5">{children}</label>;
}
