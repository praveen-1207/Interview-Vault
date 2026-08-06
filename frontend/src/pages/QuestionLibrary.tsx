import { useEffect, useState } from "react";
import { Search, Bookmark } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { Card, Input } from "../components/ui";
import { questionApi } from "../api/misc";
import type { Question } from "../types";

const difficultyColor: Record<string, string> = {
  Easy: "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  Hard: "bg-red-50 text-red-700",
};

export default function QuestionLibrary() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    questionApi
      .search({
        search: search || undefined,
        topic: topic || undefined,
        difficulty: difficulty || undefined,
      })
      .then(setQuestions)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, topic, difficulty]);

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Question Library</h1>
        <p className="text-gray-500 text-sm mt-1">Browse and practice interview questions.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          placeholder="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-40"
        />
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="">All Difficulty</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading...</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-gray-500 py-10 text-center">
            No questions yet — add questions to your interviews to build your library.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-semibold text-gray-400 shrink-0">
                    Q
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {q.topic && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{q.topic}</span>
                      )}
                      {q.difficulty && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${difficultyColor[q.difficulty] || "bg-gray-100 text-gray-500"}`}>
                          {q.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Bookmark className="w-4 h-4 text-gray-300 hover:text-brand-500 cursor-pointer transition shrink-0" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
