import { useEffect, useState, useCallback } from 'react';
import { auth, onAuthStateChange, type AuthUser } from '@/services/api/client';

interface AuthState {
  session: { access_token: string } | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Get initial session
    auth.getSession().then(({ data }) => {
      if (data?.user) {
        setState({
          session: { access_token: 'active' },
          user: data.user,
          loading: false,
          error: null,
        });
      } else {
        setState({
          session: null,
          user: null,
          loading: false,
          // Don't show auth errors on initial session check (401 is expected when not logged in)
          error: null,
        });
      }
    });

    // Listen for auth changes
    const unsubscribe = onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        auth.getSession().then(({ data }) => {
          setState((prev) => ({
            ...prev,
            session: data?.user ? { access_token: 'active' } : null,
            user: data?.user ?? null,
            loading: false,
          }));
        });
      } else if (event === 'SIGNED_OUT') {
        setState({
          session: null,
          user: null,
          loading: false,
          error: null,
        });
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await auth.signIn(email, password);
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await auth.signUp(email, password);
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    await auth.signOut();
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    clearError,
  };
}
