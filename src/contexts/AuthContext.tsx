import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const withTimeout = async <T,>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T | null> => {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        setTimeout(() => {
          console.error(`${label} timed out after ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    console.error(`${label} failed:`, error);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId?: string | null) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const result = await withTimeout(
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      2000,
      "Profile fetch"
    );

    if (!result) {
      setProfile(null);
      return;
    }

    if (result.error) {
      console.error("Profile fetch error:", result.error);
      setProfile(null);
      return;
    }

    setProfile(result.data ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user?.id ?? null);
  }, [loadProfile, user?.id]);

  useEffect(() => {
    let isActive = true;

    const applySession = (nextSession: Session | null) => {
      if (!isActive) return;

      console.log("Auth session updated:", Boolean(nextSession?.user));
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        console.log("Auth state change:", event);
        applySession(nextSession);
      }
    );

    void (async () => {
      const sessionResult = await withTimeout(supabase.auth.getSession(), 2000, "Auth bootstrap");
      if (!isActive) return;

      if (!sessionResult) {
        setLoading(false);
        return;
      }

      if (sessionResult.error) {
        console.error("Auth bootstrap error:", sessionResult.error);
        setLoading(false);
        return;
      }

      applySession(sessionResult.data.session);
    })();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
