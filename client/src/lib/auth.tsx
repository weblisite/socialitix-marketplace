import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

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
  login: (email: string, name: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
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
    queryFn: async () => {
      if (!token) return null;
      
      // First get user from Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      
      if (!authUser) return null;
      
              // Then get user profile from our database
        try {
          const response = await fetch('http://localhost:5000/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        
        if (response.ok) {
          const userData = await response.json();
          return userData as User;
        } else if (response.status === 404) {
          // Profile doesn't exist, try to create it
          try {
            const createResponse = await fetch('http://localhost:5000/api/auth/create-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                email: authUser.email!,
                name: authUser.user_metadata?.name || authUser.email!,
                role: authUser.user_metadata?.role || 'buyer',
              }),
            });
            
            if (createResponse.ok) {
              const newUserData = await createResponse.json();
              return newUserData.user as User;
            }
          } catch (createError) {
            console.warn('Failed to create user profile:', createError);
          }
          
          // Fallback to auth user data if profile creation fails
          return {
            id: parseInt(authUser.id) || 0,
            email: authUser.email!,
            name: authUser.user_metadata?.name || '',
            role: authUser.user_metadata?.role || 'buyer',
            balance: '0.00', // Default balance
            socialMediaAccounts: {},
            createdAt: authUser.created_at,
          } as User;
        } else {
          // Other error, return auth user with metadata
          return {
            id: parseInt(authUser.id) || 0,
            email: authUser.email!,
            name: authUser.user_metadata?.name || '',
            role: authUser.user_metadata?.role || 'buyer',
            balance: '0.00', // Default balance
            socialMediaAccounts: {},
            createdAt: authUser.created_at,
          } as User;
        }
      } catch (error) {
        // Fallback to auth user data
        return {
          id: parseInt(authUser.id) || 0,
          email: authUser.email!,
          name: authUser.user_metadata?.name || '',
          role: authUser.user_metadata?.role || 'buyer',
          balance: '0.00', // Default balance
          socialMediaAccounts: {},
          createdAt: authUser.created_at,
        } as User;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setToken(data.session?.access_token || null);
      if (data.session?.access_token) {
        localStorage.setItem('token', data.session.access_token);
      }
      queryClient.setQueryData(['/api/user/profile'], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name, role }: { email: string; password: string; name: string; role: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          }
        }
      });
      if (error) throw error;
      
      // Create user profile in our database
      if (data.session?.access_token) {
        try {
          const profileResponse = await fetch('http://localhost:5000/api/auth/create-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({
              email,
              name,
              role,
            }),
          });
          
          if (!profileResponse.ok) {
            console.warn('Failed to create user profile:', await profileResponse.text());
          }
        } catch (error) {
          console.warn('Error creating user profile:', error);
        }
      }
      
      return data;
    },
    onSuccess: (data) => {
      setToken(data.session?.access_token || null);
      if (data.session?.access_token) {
        localStorage.setItem('token', data.session.access_token);
      }
      queryClient.setQueryData(['/api/user/profile'], data.user);
    },
  });

  const login = async (email: string, name: string) => {
    // This function is called after successful authentication
    // The actual login is handled by Supabase auth state listener
    // We just need to ensure the user data is properly set
    queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    await registerMutation.mutateAsync({ email, password, name, role });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
    localStorage.removeItem('token');
    queryClient.clear();
  };

  // Supabase handles auth headers automatically
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setToken(session.access_token);
          localStorage.setItem('token', session.access_token);
          
          // Try to create user profile if it doesn't exist
          try {
            const user = session.user;
            const profileResponse = await fetch('http://localhost:5000/api/auth/create-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                email: user.email!,
                name: user.user_metadata?.name || user.email!,
                role: user.user_metadata?.role || 'buyer',
              }),
            });
            
            if (!profileResponse.ok && profileResponse.status !== 400) {
              console.warn('Failed to create user profile:', await profileResponse.text());
            }
          } catch (error) {
            console.warn('Error creating user profile:', error);
            }
            
          // Invalidate user profile query to refetch with new token
          queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
        } else if (event === 'SIGNED_OUT') {
          setToken(null);
          localStorage.removeItem('token');
          queryClient.clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

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


