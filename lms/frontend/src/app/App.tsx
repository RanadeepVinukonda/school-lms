import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function App() {
  useAuth();
  return <RouterProvider router={router} />;
}
