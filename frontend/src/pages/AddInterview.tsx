import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { Card } from "../components/ui";
import InterviewForm from "../components/InterviewForm";

// ---- AddInterview (page) -----------------------------------------------
// Full-page version of the "Add New Interview" form (reachable at
// /interviews/new). The actual form logic lives in InterviewForm so it is
// shared with the popup version used on the Interviews page. On success we
// navigate to the newly created interview's detail page.
export default function AddInterview() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Add New Interview</h1>
        <p className="text-gray-500 text-sm mb-6">Add the details of your interview experience.</p>

        <Card>
          <InterviewForm
            onCancel={() => navigate("/interviews")}
            onCreated={(interview) => navigate(`/interviews/${interview.id}`)}
          />
        </Card>
      </div>
    </AppLayout>
  );
}
