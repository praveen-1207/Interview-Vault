// Topbar — the sticky header shown above every authenticated page.
// Holds a decorative search box on the left and two interactive controls on
// the right: the bell (NotificationsDropdown, shows interviews waiting for a
// status update) and the avatar (ProfileDropdown, shows the user's details).
import { Search } from "lucide-react";
import NotificationsDropdown from "./NotificationsDropdown";
import ProfileDropdown from "./ProfileDropdown";

export default function Topbar() {
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
        <NotificationsDropdown />
        <ProfileDropdown />
      </div>
    </header>
  );
}
