import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Library, BarChart3, CalendarClock,
  User, Settings, LogOut, Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/interviews", label: "Interviews", icon: Briefcase },
  { to: "/questions", label: "Question Library", icon: Library },
  { to: "/analysis", label: "AI Analysis", icon: BarChart3 },
  { to: "/planner", label: "Study Planner", icon: CalendarClock, badge: "Coming Soon" },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 border-r border-gray-100 bg-white flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 flex items-center gap-2 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg text-gray-900">InterviewVault</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </span>
            {badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
          <p className="text-xs font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Upgrade to Pro
          </p>
          <p className="text-[11px] text-brand-100 mt-1 mb-3">
            Unlock advanced analytics and AI features.
          </p>
          <button className="w-full bg-white text-brand-700 text-xs font-semibold py-1.5 rounded-lg hover:bg-brand-50 transition">
            Upgrade Now
          </button>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-red-600 transition w-full"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Logout
        </button>
      </div>
    </aside>
  );
}
