import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';

export default function WelcomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(ROUTES.LOGIN, { replace: true });
  }, [navigate]);

  return null;
}
