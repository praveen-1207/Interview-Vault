import { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Card } from "../components/ui";
import { analyticsApi } from "../api/misc";
import type { Analytics } from "../types";

// ---- AIAnalysis --------------------------------------------------------
// Insights page: overall confidence, success rate, total interviews, and a
// status breakdown bar. All numbers come from the /api/analytics endpoint,
// which the backend keeps updated automatically.
export default function AIAnalysis() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Fetch analytics once on mount.
  useEffect(() => {
    analyticsApi.get().then(setAnalytics);
  }, []);

  // Percent of selected interviews out of everything tracked.
  const successRate = analytics && analytics.total_interviews > 0
    ? Math.round((analytics.selected / analytics.total_interviews) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Analysis</h1>
        <p className="text-gray-500 text-sm mt-1">Your performance analysis and insights.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gray-500 mb-2">Overall Confidence</p>
          <p className="text-4xl font-bold text-brand-600">{analytics?.avg_confidence ?? 0}<span className="text-lg text-gray-400">/10</span></p>
          <p className="text-xs text-gray-400 mt-1">Based on your self-rated confidence across interviews.</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 mb-2">Success Rate</p>
          <p className="text-4xl font-bold text-emerald-600">{successRate}%</p>
          <p className="text-xs text-gray-400 mt-1">
            {analytics?.selected ?? 0} selected out of {analytics?.total_interviews ?? 0} interviews.
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 mb-2">Total Interviews</p>
          <p className="text-4xl font-bold text-gray-900">{analytics?.total_interviews ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Across all companies you've tracked.</p>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Status Breakdown</h3>
        {!analytics || analytics.total_interviews === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No interview data yet. Add interviews to see AI-driven insights here.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Selected", value: analytics.selected, color: "bg-emerald-500" },
              { label: "Next Round", value: analytics.next_round, color: "bg-violet-500" },
              { label: "Awaiting", value: analytics.awaiting_result, color: "bg-amber-500" },
              { label: "No Response", value: analytics.no_response, color: "bg-orange-500" },
              { label: "Rejected", value: analytics.rejected, color: "bg-red-500" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full ${s.color}`}
                    style={{ width: `${(s.value / analytics.total_interviews) * 100}%` }}
                  />
                </div>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
