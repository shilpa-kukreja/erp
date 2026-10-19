'use client';
import { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const router = useRouter();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 60 * 1000,
  });

  const user = meQuery.data?.data?.user || null;
  const loading = meQuery.isLoading;

  const login = useCallback(
    async (credentials) => {
      const res = await authApi.login(credentials);
      qc.setQueryData(['auth', 'me'], res);
      return res;
    },
    [qc]
  );

  const register = useCallback(
    async (data) => {
      const res = await authApi.register(data);
      qc.setQueryData(['auth', 'me'], res);
      return res;
    },
    [qc]
  );

 const logout = useCallback(async () => {
  try {
    await authApi.logout();
  } catch (err) {
    console.error('[logout] API failed:', err);
  } finally {
    // Clear ALL cached queries (not just auth) to prevent stale data
    qc.clear();
    // Hard redirect — avoids stale meQuery refetch during client nav
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    } else {
      router.replace('/login');
    }
  }
}, [qc, router]);

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated: !!user, login, register, logout,
      refetch: meQuery.refetch,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}