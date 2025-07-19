import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'buyer' | 'provider' | 'admin';
  balance: string;
  socialMediaAccounts: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/user/profile'],
    enabled: !!token,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest('POST', '/api/auth/login', { email, password });
      return await res.json();
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem('token', data.token);
      queryClient.setQueryData(['/api/user/profile'], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name, role }: { email: string; password: string; name: string; role: string }) => {
      const res = await apiRequest('POST', '/api/auth/register', { email, password, name, role });
      return await res.json();
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem('token', data.token);
      queryClient.setQueryData(['/api/user/profile'], data.user);
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    await registerMutation.mutateAsync({ email, password, name, role });
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    queryClient.clear();
  };

  // Add token to requests
  useEffect(() => {
    if (token) {
      queryClient.setDefaultOptions({
        queries: {
          ...queryClient.getDefaultOptions().queries,
          queryFn: async ({ queryKey }) => {
            const res = await fetch(queryKey.join('/'), {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              credentials: 'include',
            });
            
            if (!res.ok) {
              throw new Error(`${res.status}: ${res.statusText}`);
            }
            
            return await res.json();
          },
        },
      });
    }
  }, [token, queryClient]);

  return (
    <AuthContext.Provider value={{
      user: user || null,
      login,
      register,
      logout,
      isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


