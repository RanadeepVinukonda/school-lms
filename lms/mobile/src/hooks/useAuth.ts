import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const store = useAuthStore();
  const { initialize, user, isAuthenticated, isLoading, logout, hasRole } = store;

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
    hasRole,
  };
}
