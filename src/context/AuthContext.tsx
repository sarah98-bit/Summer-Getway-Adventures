import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export interface AuthContextValue {
  user: User | null;
  role: 'admin' | 'customer' | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'customer' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const inFlightSyncRef = useRef<Map<string, Promise<void>>>(new Map());

  const syncUserRole = useCallback(async (firebaseUser: User) => {
    const existingPromise = inFlightSyncRef.current.get(firebaseUser.uid);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setRole(data.user?.role === 'admin' ? 'admin' : 'customer');
        } else {
          setRole('customer');
        }
      } catch {
        setRole('customer');
      } finally {
        inFlightSyncRef.current.delete(firebaseUser.uid);
      }
    })();

    inFlightSyncRef.current.set(firebaseUser.uid, promise);
    return promise;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        await syncUserRole(nextUser);
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [syncUserRole]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        await syncUserRole(cred.user);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Google Sign-In could not be completed.';
      setAuthError(msg);
      throw err;
    }
  }, [syncUserRole]);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
    setRole(null);
  }, []);

  const getToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        authError,
        signInWithGoogle,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return ctx;
}
