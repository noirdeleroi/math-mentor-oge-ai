
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PrivateRoute = () => {
  const { user, isLoading } = useAuth();
  
  // If still loading authentication state, show nothing
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Загрузка...</div>;
  }
  
  // If not authenticated, redirect to home page
  if (!user) {
    return <Navigate to="/" />;
  }
  
  // If authenticated, render the route
  return <Outlet />;
};

export default PrivateRoute;
