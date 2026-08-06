import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { Card, StatusBadge, Input } from "../components/ui";
import { interviewApi } from "../api/interviews";
import type { Interview } from "../types";

export default function Interviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    interviewApi
      .list(statusFilter ? { status: statusFilter } : undefined)
      .then(setInterviews)
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const filtered = interviews.filter(
    (i) =>
      i.company_name.toLowerCase().includes(search.toLowerCase()) ||
      i.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all your interview experiences.</p>
        </div>
        <Link
          to="/interviews/new"
          className="bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Interview
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="">All Statuses</option>
          <option value="selected">Selected</option>
          <option value="waiting">Waiting</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-gray-500 mb-3">No interviews found.</p>
            <Link to="/interviews/new" className="text-brand-600 font-medium text-sm">
              + Add your first interview
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Rounds</th>
                <th className="pb-3 font-medium">Confidence</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 transition cursor-pointer">
                  <td className="py-3">
                    <Link to={`/interviews/${i.id}`} className="font-medium text-gray-900">
                      {i.company_name}
                    </Link>
                  </td>
                  <td className="py-3 text-gray-600">{i.role}</td>
                  <td className="py-3 text-gray-500">
                    {i.date ? new Date(i.date).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 text-gray-500">{i.rounds.length}</td>
                  <td className="py-3 text-gray-500">{i.confidence}/10</td>
                  <td className="py-3">
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AppLayout>
  );
}
