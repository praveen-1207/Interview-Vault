// ProfileDropdown — the avatar + name in the top bar.
// Clicking it slides open a small panel with the user's name and quick links
// to the Profile popup ("View Profile") and the Settings page. Editing and
// logout live on the Settings page itself.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, User, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ProfileDropdown() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Build 2-letter initials from the user's name (e.g. "Jane Doe" -> "JD").
  const initials = user?.name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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

  return (
    <div className="relative" ref={rootRef}>
      {/* The button is the user's avatar + name; clicking it toggles the panel. */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-50 transition"
      >
        <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
          {initials || "U"}
        </div>
        <div className="leading-tight text-left hidden sm:block">
          <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
        </div>
        {/* Chevron rotates to signal the panel is open. */}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-60 rounded-2xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden z-20 animate-dropdown-slide">
          {/* Name only — details live on the Profile popup */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
              {initials || "U"}
            </div>
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
          </div>

          {/* Quick links. Each closes the panel when navigated. */}
          <div className="py-2">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <User className="w-4 h-4 text-gray-400" /> View Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <Settings className="w-4 h-4 text-gray-400" /> Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
