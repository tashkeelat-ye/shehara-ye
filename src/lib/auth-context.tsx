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

export type AccountRole =
  | "customer"
  | "vendor"
  | "courier"
  | "admin";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  wallet_balance: number;
  preferred_currency: string;
  accepted_terms: boolean;
  accepted_order_policy: boolean;
  is_disabled: boolean;
};

type AuthAccountState = {
  role: AccountRole;
  roles: AccountRole[];
  accountEnabled: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;

  /**
   * الدور الأساسي المستخدم للتوجيه داخل التطبيق.
   *
   * الأولوية:
   * admin → vendor → courier → customer
   */
  role: AccountRole | null;

  /**
   * جميع الأدوار المسجلة للمستخدم.
   */
  roles: AccountRole[];

  /**
   * هل الحساب مسموح له باستخدام النظام؟
   *
   * بالنسبة للعميل يعتمد على profiles.is_disabled.
   * بالنسبة للتاجر/عامل التوصيل يعتمد أيضاً على account_enabled.
   */
  accountEnabled: boolean;

  loading: boolean;

  signUp: (args: {
    phone: string;
    fullName: string;
    password: string;
  }) => Promise<{ error: string | null }>;

  signIn: (args: {
    phone: string;
    password: string;
  }) => Promise<{ error: string | null }>;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;

  refreshAuthState: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_PRIORITY: AccountRole[] = [
  "admin",
  "vendor",
  "courier",
  "customer",
];

function isAccountRole(value: unknown): value is AccountRole {
  return (
    value === "customer" ||
    value === "vendor" ||
    value === "courier" ||
    value === "admin"
  );
}

function resolvePrimaryRole(roles: AccountRole[]): AccountRole {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }

  return "customer";
}

function getAccountDisabledMessage(role: AccountRole): string {
  switch (role) {
    case "vendor":
      return "حساب التاجر معطل حالياً. يرجى التواصل مع الإدارة.";

    case "courier":
      return "حساب عامل التوصيل معطل حالياً. يرجى التواصل مع الإدارة.";

    case "admin":
      return "حساب الإدارة معطل حالياً. يرجى التواصل مع الإدارة.";

    default:
      return "حسابك معطل حالياً. يرجى التواصل مع الإدارة.";
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [role, setRole] =
    useState<AccountRole | null>(null);

  const [roles, setRoles] =
    useState<AccountRole[]>([]);

  const [accountEnabled, setAccountEnabled] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  /**
   * =========================================================
   * تحميل حالة الحساب بالكامل
   * =========================================================
   *
   * لا نعتمد على user_metadata لتحديد صلاحيات المستخدم.
   *
   * المصدر الحقيقي للصلاحيات هو:
   *
   * user_roles
   *
   * وحالة الحساب تراجع من:
   *
   * profiles.is_disabled
   * vendors.account_enabled
   * couriers.account_enabled
   */
  const loadAuthState = useCallback(
    async (userId: string): Promise<AuthAccountState> => {
      const [
        profileResult,
        rolesResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id,full_name,phone,wallet_balance,preferred_currency,accepted_terms,accepted_order_policy,is_disabled",
          )
          .eq("id", userId)
          .maybeSingle<Profile>(),

        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId),
      ]);

      const loadedProfile =
        profileResult.data ?? null;

      if (profileResult.error) {
        console.error(
          "[Auth] Failed to load profile:",
          profileResult.error,
        );
      }

      if (rolesResult.error) {
        console.error(
          "[Auth] Failed to load user roles:",
          rolesResult.error,
        );
      }

      setProfile(loadedProfile);

      const loadedRoles: AccountRole[] =
        (rolesResult.data ?? [])
          .map((row) => row.role)
          .filter(isAccountRole);

      /**
       * الحسابات القديمة قد لا يكون لها role
       * بسبب اختلاف النسخ السابقة من قاعدة البيانات.
       *
       * في هذه الحالة نعامل المستخدم كعميل،
       * وليس كمدير أو تاجر أو عامل توصيل.
       */
      const normalizedRoles =
        loadedRoles.length > 0
          ? loadedRoles
          : (["customer"] as AccountRole[]);

      const primaryRole =
        resolvePrimaryRole(normalizedRoles);

      setRoles(normalizedRoles);
      setRole(primaryRole);

      let enabled =
        !Boolean(loadedProfile?.is_disabled);

      /**
       * التحقق من حالة التاجر.
       *
       * نستخدم user_id بدلاً من id لأن id هو معرف
       * سجل التاجر وليس معرف مستخدم Supabase.
       */
      if (primaryRole === "vendor") {
        const { data, error } = await supabase
          .from("vendors")
          .select("account_enabled,is_active")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error(
            "[Auth] Failed to load vendor account state:",
            error,
          );
        }

        if (data) {
          enabled =
            enabled &&
            data.account_enabled !== false &&
            data.is_active !== false;
        }
      }

      /**
       * التحقق من حالة عامل التوصيل.
       */
      if (primaryRole === "courier") {
        const { data, error } = await supabase
          .from("couriers")
          .select("account_enabled,is_active")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error(
            "[Auth] Failed to load courier account state:",
            error,
          );
        }

        if (data) {
          enabled =
            enabled &&
            data.account_enabled !== false &&
            data.is_active !== false;
        }
      }

      /**
       * المدير يعتمد حالياً على role + profiles.
       *
       * لا نضع account_enabled للمدير لأن جدول
       * الإدارة الحالي لا يستخدم هذا العمود.
       */
      setAccountEnabled(enabled);

      return {
        role: primaryRole,
        roles: normalizedRoles,
        accountEnabled: enabled,
      };
    },
    [],
  );

  /**
   * =========================================================
   * تسجيل الخروج الآمن
   * =========================================================
   */
  const clearAuthState = useCallback(() => {
    setSession(null);
    setProfile(null);
    setRole(null);
    setRoles([]);
    setAccountEnabled(true);
  }, []);

  /**
   * =========================================================
   * مراقبة جلسة Supabase
   * =========================================================
   */
  useEffect(() => {
    let mounted = true;

    const {
      data: subscription,
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (!newSession) {
          clearAuthState();
        }
      },
    );

    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;

        const currentSession =
          data.session ?? null;

        setSession(currentSession);

        if (!currentSession?.user?.id) {
          setLoading(false);
          return;
        }

        try {
          await loadAuthState(
            currentSession.user.id,
          );
        } catch (error) {
          console.error(
            "[Auth] Failed to initialize auth state:",
            error,
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      })
      .catch((error) => {
        console.error(
          "[Auth] Failed to restore session:",
          error,
        );

        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [clearAuthState, loadAuthState]);

  /**
   * =========================================================
   * إعادة تحميل بيانات الحساب عند تغير المستخدم
   * =========================================================
   */
  useEffect(() => {
    if (!session?.user?.id) return;

    void loadAuthState(session.user.id);
  }, [
    session?.user?.id,
    loadAuthState,
  ]);

  /**
   * =========================================================
   * إنشاء حساب عميل
   * =========================================================
   */
  const signUp =
    useCallback<AuthContextValue["signUp"]>(
      async ({
        phone,
        fullName,
        password,
      }) => {
        const normalizedPhone =
          normalizeYemeniPhone(phone);

        const { error } =
          await supabase.auth.signUp({
            email:
              phoneToEmail(normalizedPhone),
            password,
            options: {
              data: {
                full_name: fullName,
                phone: normalizedPhone,
                account_type: "customer",
              },

              ...(typeof window !==
              "undefined"
                ? {
                    emailRedirectTo:
                      window.location.origin,
                  }
                : {}),
            },
          });

        if (error) {
          if (
            /already registered|already been registered/i.test(
              error.message,
            )
          ) {
            return {
              error:
                "هذا الرقم مسجّل مسبقًا، يمكنك تسجيل الدخول.",
            };
          }

          return {
            error: error.message,
          };
        }

        /**
         * التفعيل تلقائي في إعدادات المشروع الحالية،
         * لذلك نحاول تسجيل الدخول مباشرة.
         */
        const {
          error: signInError,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                phoneToEmail(
                  normalizedPhone,
                ),
              password,
            },
          );

        if (signInError) {
          return {
            error:
              signInError.message,
          };
        }

        return {
          error: null,
        };
      },
      [],
    );

  /**
   * =========================================================
   * تسجيل الدخول
   * =========================================================
   */
  const signIn =
    useCallback<AuthContextValue["signIn"]>(
      async ({
        phone,
        password,
      }) => {
        const normalizedPhone =
          normalizeYemeniPhone(phone);

        const {
          data,
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                phoneToEmail(
                  normalizedPhone,
                ),
              password,
            },
          );

        if (error) {
          if (
            /invalid login credentials/i.test(
              error.message,
            )
          ) {
            return {
              error:
                "رقم الهاتف أو كلمة المرور غير صحيحة.",
            };
          }

          if (
            /user is banned|banned/i.test(
              error.message,
            )
          ) {
            return {
              error:
                "هذا الحساب معطل حالياً. يرجى التواصل مع الإدارة.",
            };
          }

          return {
            error: error.message,
          };
        }

        if (!data.user) {
          return {
            error:
              "تعذر إنشاء جلسة تسجيل الدخول.",
          };
        }

        /**
         * نتحقق من الدور وحالة الحساب مباشرة بعد الدخول.
         *
         * هذا مهم جداً للحسابات التي أنشأها المدير:
         *
         * vendor
         * courier
         * admin
         */
        const state =
          await loadAuthState(
            data.user.id,
          );

        if (!state.accountEnabled) {
          await supabase.auth.signOut();
          clearAuthState();

          return {
            error:
              getAccountDisabledMessage(
                state.role,
              ),
          };
        }

        return {
          error: null,
        };
      },
      [
        clearAuthState,
        loadAuthState,
      ],
    );

  /**
   * =========================================================
   * تسجيل الخروج
   * =========================================================
   */
  const signOut =
    useCallback(async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        clearAuthState();
      }
    }, [clearAuthState]);

  /**
   * =========================================================
   * تحديث بيانات الحساب
   * =========================================================
   */
  const refreshAuthState =
    useCallback(async () => {
      if (!session?.user?.id) {
        clearAuthState();
        return;
      }

      await loadAuthState(
        session.user.id,
      );
    }, [
      clearAuthState,
      loadAuthState,
      session?.user?.id,
    ]);

  /**
   * الحفاظ على API القديم:
   *
   * refreshProfile()
   *
   * مع تحديث حالة الحساب والأدوار أيضاً.
   */
  const refreshProfile =
    useCallback(async () => {
      await refreshAuthState();
    }, [refreshAuthState]);

  const value =
    useMemo<AuthContextValue>(
      () => ({
        session,
        user:
          session?.user ?? null,
        profile,

        role,
        roles,
        accountEnabled,

        loading,

        signUp,
        signIn,
        signOut,

        refreshProfile,
        refreshAuthState,
      }),
      [
        session,
        profile,
        role,
        roles,
        accountEnabled,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshAuthState,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return ctx;
}
