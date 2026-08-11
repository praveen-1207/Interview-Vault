import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler,
} from "chart.js";
import AppLayout from "../components/layout/AppLayout";
import { Card, StatusBadge } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { interviewApi } from "../api/interviews";
import { analyticsApi } from "../api/misc";
import type { Interview, Analytics } from "../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ---- Dashboard ---------------------------------------------------------
// The home page: stat cards (counts), a monthly activity line chart, a
// company distribution panel, and a list of the 5 most recent interviews.
// All data comes from two parallel API calls on mount.
export default function Dashboard() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Load interviews + analytics together on mount (Promise.all = both at once).
  useEffect(() => {
    Promise.all([interviewApi.list(), analyticsApi.get()])
      .then(([i, a]) => {
        setInterviews(i);
        setAnalytics(a);
      })
      .finally(() => setLoading(false));
  }, []);

  // The headline numbers shown as stat cards (new status lifecycle).
  const stats = [
    { label: "Total Interviews", value: analytics?.total_interviews ?? 0, color: "text-gray-900" },
    { label: "Selected", value: analytics?.selected ?? 0, color: "text-emerald-600" },
    { label: "Next Round", value: analytics?.next_round ?? 0, color: "text-violet-600" },
    { label: "Awaiting Result", value: analytics?.awaiting_result ?? 0, color: "text-amber-600" },
    { label: "No Response", value: analytics?.no_response ?? 0, color: "text-orange-600" },
    { label: "Rejected", value: analytics?.rejected ?? 0, color: "text-red-600" },
  ];

  // Turn the monthly activity map into sorted labels + one dataset for chart.js.
  const monthly = analytics?.monthly_activity || {};
  const months = Object.keys(monthly).sort();
  const chartData = {
    labels: months.length ? months : ["No data yet"],
    datasets: [
      {
        data: months.length ? months.map((m) => monthly[m]) : [0],
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79,70,229,0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
    ],
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back, {user?.name?.split(" ")[0]}! Let's crack the next interview.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {(analytics?.needs_attention ?? 0) > 0 && (
        <Link
          to="/interviews"
          className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 hover:bg-amber-100 transition"
        >
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
              {(analytics?.needs_attention ?? 0) > 9 ? "9+" : analytics?.needs_attention}
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {(analytics?.needs_attention ?? 0) === 1
                  ? "1 interview needs an update"
                  : `${analytics?.needs_attention} interviews need updates`}
              </p>
              <p className="text-xs text-amber-700">
                Update the status of your pending interviews to keep your tracker accurate.
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-amber-900">Review →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Interview Activity</h3>
            <span className="text-xs text-gray-400">Avg confidence: {analytics?.avg_confidence ?? 0}/10</span>
          </div>
          <div className="h-56">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
              }}
            />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Company Distribution</h3>
          {Object.keys(analytics?.company_distribution || {}).length === 0 ? (
            <p className="text-sm text-gray-400">No interviews logged yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(analytics!.company_distribution).map(([company, count]) => (
                <div key={company}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{company}</span>
                    <span className="text-gray-400">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${(count / analytics!.total_interviews) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Interviews</h3>
          <Link to="/interviews" className="text-sm text-brand-600 font-medium">View all</Link>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : interviews.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-3">No interviews yet — add your first one.</p>
            <Link to="/interviews/new" className="text-brand-600 font-medium text-sm">
              + Add Interview
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {interviews.slice(0, 5).map((i) => (
              <Link
                key={i.id}
                to={`/interviews/${i.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition"
              >
                <div>
                  <p className="font-medium text-gray-900">{i.company_name}</p>
                  <p className="text-sm text-gray-500">{i.role}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {i.date ? new Date(i.date).toLocaleDateString() : "No date"}
                  </span>
                  <StatusBadge status={i.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
