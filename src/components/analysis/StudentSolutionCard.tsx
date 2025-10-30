import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MathRenderer from "@/components/MathRenderer";

interface Props {
  title?: string;
  studentSolution?: string;
}

const StudentSolutionCard = ({ title = "Ваше решение", studentSolution }: Props) => {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white border border-blue-200 rounded-lg p-4 max-h-96 overflow-y-auto">
          {studentSolution ? (
            <MathRenderer text={studentSolution} compiler="mathjax" />
          ) : (
            <div className="text-sm text-gray-500">Решение из фото ещё обрабатывается…</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentSolutionCard;


