import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MathRenderer from "@/components/MathRenderer";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  title?: string;
  studentSolution?: string; // Optional: can be passed directly, otherwise fetches automatically
  autoFetch?: boolean; // Whether to auto-fetch from profiles.telegram_input (default: true)
}

const StudentSolutionCard = ({ 
  title = "Ваше решение", 
  studentSolution: providedSolution,
  autoFetch = true 
}: Props) => {
  const { user } = useAuth();
  const [fetchedSolution, setFetchedSolution] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch student solution from profiles.telegram_input if not provided and autoFetch is enabled
  useEffect(() => {
    const fetchStudentSolution = async () => {
      if (!autoFetch || providedSolution || !user) {
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch telegram_input from profiles table for the current user
        const { data, error } = await supabase
          .from('profiles')
          .select('telegram_input')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching student solution:', error);
          setFetchedSolution("");
        } else {
          setFetchedSolution(data?.telegram_input || "");
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
            <div className="text-sm text-gray-500">Решение не обнаружено</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentSolutionCard;


