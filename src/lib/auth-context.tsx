import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizeYemeniPhone, phoneToEmail } from "@/lib/phone";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  wallet_balance: number;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (args: {
    phone: string;
    fullName: string;
    password: string;
  }) => Promise<{ error: string | null }>;
  signIn: (args: { phone: string; password: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,phone,wallet_balance")
      .eq("id", userId)
      .maybeSingle<Profile>();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) setProfile(null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) void loadProfile(session.user.id);
  }, [session?.user?.id, loadProfile]);

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async ({ phone, fullName, password }) => {
      const { error } = await supabase.auth.signUp({
        email: phoneToEmail(phone),
        password,
        options: {
          data: { full_name: fullName, phone: normalizeYemeniPhone(phone) },
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) {
        if (/already registered|already been registered/i.test(error.message))
          return { error: "هذا الرقم مسجّل مسبقًا، يمكنك تسجيل الدخول." };
        return { error: error.message };
      }
      // التفعيل تلقائي، لذلك نسجّل الدخول مباشرة
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(phone),
        password,
      });
      if (signInError) return { error: signInError.message };
      return { error: null };
    },
    [],
  );

  const signIn = useCallback<AuthContextValue["signIn"]>(async ({ phone, password }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    });
    if (error) {
      if (/invalid login credentials/i.test(error.message))
        return { error: "رقم الهاتف أو كلمة المرور غير صحيحة." };
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  }, [session?.user?.id, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signUp, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
