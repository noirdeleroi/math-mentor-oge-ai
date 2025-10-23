// Legacy page - redirects to Egeruses2
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Egeruses = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/egeruses2', { replace: true });
  }, [navigate]);

  return null;
};

export default Egeruses;
