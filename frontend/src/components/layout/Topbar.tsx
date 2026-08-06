import { Search, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Topbar() {
  const { user } = useAuth();
  const initials = user?.name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 w-80">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          placeholder="Search anything..."
          className="bg-transparent outline-none text-sm w-full placeholder:text-gray-400"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-brand-500" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
            {initials || "U"}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-400">Student</p>
          </div>
        </div>
      </div>
    </header>
  );
}
