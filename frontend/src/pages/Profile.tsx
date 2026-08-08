// Profile — shows the logged-in user's personal details in a popup-style card.
// Reached via "View Profile" in the top bar. Read-only with no edit controls;
// editing happens on the Settings page.
import { useNavigate } from "react-router-dom";
import { X, Mail, Briefcase, MapPin, Target, Link2, Code, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Build 2-letter initials from the user's name (e.g. "Jane Doe" -> "JD").
  const initials = user?.name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Human-readable "Member since" date from the account creation timestamp.
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // The rows rendered inside the popup. Each has an icon, a label and the
  // value to show (email, occupation, target role, location, social links).
  const details = [
    { icon: Mail, label: "Email", value: user?.email },
    { icon: Briefcase, label: "Occupation", value: user?.occupation || "Not set" },
    { icon: Target, label: "Target Role", value: user?.target_role || "Not set" },
    { icon: MapPin, label: "Location", value: user?.location || "Not set" },
    { icon: Link2, label: "LinkedIn", value: user?.linkedin || "Not set" },
    { icon: Code, label: "GitHub", value: user?.github || "Not set" },
  ];

  return (
    <div className="min-h-screen bg-[#1e1b2e]/40 flex items-center justify-center p-4">
      {/* Backdrop: clicking outside the popup closes it and goes back */}
      <button
        className="absolute inset-0 cursor-default"
        onClick={() => navigate("/dashboard")}
        aria-label="Close profile popup"
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-dropdown-slide">
        {/* Header: avatar, name, email and the close button */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-bold">
              {initials || "U"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close profile popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Personal details: one labelled row per field. LinkedIn/GitHub render
            as clickable links when set, plain text otherwise. */}
        <div className="px-6 py-4 space-y-1">
          {details.map(({ icon: Icon, label, value }) => {
            const isLink =
              (label === "LinkedIn" && !!user?.linkedin) ||
              (label === "GitHub" && !!user?.github);
            return (
              <div
                key={label}
                className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <div className="w-9 h-9 shrink-0 rounded-lg bg-gray-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
                  {isLink ? (
                    <a
                      href={value!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-brand-600 hover:underline break-all"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
                  )}
                </div>
              </div>
            );
          })}

          {user?.bio && (
            <div className="pt-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Bio</p>
              <p className="text-sm text-gray-600">{user.bio}</p>
            </div>
          )}

          {joined && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400 pt-2">
              <Calendar className="w-3.5 h-3.5" /> Member since {joined}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
