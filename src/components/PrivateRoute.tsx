
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PrivateRoute = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // If still loading authentication state, show loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        Загрузка...
      </div>
    );
  }
  
  // If not authenticated, show login message
  if (!user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center text-foreground cursor-pointer hover:underline text-xl"
        onClick={() => navigate('/register')}
      >
        Войдите в систему
      </div>
    );
  }
  
  // If authenticated, render the route
  return <Outlet />;
};

export default PrivateRoute;
