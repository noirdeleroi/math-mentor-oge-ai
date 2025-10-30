import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MathRenderer from "@/components/MathRenderer";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  title?: string;
  studentSolution?: string; // Optional: can be passed directly, otherwise fetches automatically
  autoFetch?: boolean; // Whether to auto-fetch from telegram_uploads (default: true)
}

const StudentSolutionCard = ({ 
  title = "Ваше решение", 
  studentSolution: providedSolution,
  autoFetch = true 
}: Props) => {
  const { user } = useAuth();
  const [fetchedSolution, setFetchedSolution] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch student solution from telegram_uploads if not provided and autoFetch is enabled
  useEffect(() => {
    const fetchStudentSolution = async () => {
      if (!autoFetch || providedSolution || !user) {
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch the most recent extracted_text for the current user
        // @ts-ignore - Supabase type instantiation issue
        const { data, error } = await supabase
          .from('telegram_uploads')
          .select('extracted_text')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching student solution:', error);
          setFetchedSolution("");
        } else {
          setFetchedSolution(data?.extracted_text || "");
        }
      } catch (error) {
        console.error('Error in fetchStudentSolution:', error);
        setFetchedSolution("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentSolution();
  }, [user, autoFetch, providedSolution]);

  const displaySolution = providedSolution || fetchedSolution;

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white border border-blue-200 rounded-lg p-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-sm text-gray-500">Загрузка решения...</div>
          ) : displaySolution ? (
            <MathRenderer text={displaySolution} compiler="mathjax" />
          ) : (
            <div className="text-sm text-gray-500">Решение из фото ещё обрабатывается…</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentSolutionCard;


